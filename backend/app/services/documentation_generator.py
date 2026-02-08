"""
Documentation Generator Service

Generates structured, MNC-standard documentation for repository code files
and folders using GPT-4o with tree-sitter AST context.
"""

import os
import logging
from typing import List, Dict, Any, Optional

from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

from app.config import get_settings
from app.services.parser import ParserService, LANGUAGE_EXTENSIONS, TEXT_EXTENSIONS

logger = logging.getLogger(__name__)

# Files/folders to skip during documentation
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".next", "dist", "build",
    ".venv", "venv", "env", ".env", ".idea", ".vscode", "coverage",
    ".mypy_cache", ".pytest_cache", "egg-info",
}
SKIP_FILES = {
    ".DS_Store", "Thumbs.db", ".gitignore", ".env", "package-lock.json",
    "yarn.lock", "pnpm-lock.yaml", ".eslintcache",
}
MAX_FILE_SIZE = 100_000  # 100KB max per file


class DocumentationGenerator:
    """Generates structured documentation for an entire repository."""

    def __init__(self):
        settings = get_settings()
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.2,
            openai_api_key=settings.openai_api_key,
        )
        self.parser = ParserService()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_repository_docs(self, repo_path: str) -> Dict[str, Any]:
        """
        Generate full documentation for a repository.

        Returns a dict with:
          - overview: str
          - architecture: str
          - folder_tree: str
          - files: list[FileDocumentation]
          - dependencies: str
        """
        logger.info("Generating repository documentation for %s", repo_path)

        # 1. Walk the tree and collect file metadata
        tree_str, file_paths = self._walk_tree(repo_path)

        # 2. Generate per-file documentation
        file_docs: List[Dict[str, Any]] = []
        for fpath in file_paths:
            try:
                doc = await self._document_file(repo_path, fpath)
                if doc:
                    file_docs.append(doc)
            except Exception as exc:
                logger.warning("Skipping %s: %s", fpath, exc)

        # 3. Build high-level summaries via LLM
        overview = await self._generate_overview(repo_path, tree_str, file_docs)
        architecture = await self._generate_architecture(tree_str, file_docs)
        dependencies = await self._generate_dependencies(repo_path, file_docs)

        return {
            "overview": overview,
            "architecture": architecture,
            "folder_tree": tree_str,
            "files": file_docs,
            "dependencies": dependencies,
        }

    async def generate_file_docs(self, repo_path: str, file_path: str) -> Dict[str, Any]:
        """Generate documentation for a single file (on-demand)."""
        doc = await self._document_file(repo_path, file_path)
        if not doc:
            return {"path": file_path, "sections": [], "summary": "Could not parse file."}
        return doc

    # ------------------------------------------------------------------
    # Tree walker
    # ------------------------------------------------------------------

    def _walk_tree(self, repo_path: str) -> tuple:
        """Return (tree_string, list_of_relative_file_paths)."""
        lines: List[str] = []
        file_paths: List[str] = []

        def _recurse(directory: str, prefix: str = ""):
            try:
                entries = sorted(os.listdir(directory))
            except PermissionError:
                return

            dirs = [e for e in entries if os.path.isdir(os.path.join(directory, e)) and e not in SKIP_DIRS]
            files = [e for e in entries if os.path.isfile(os.path.join(directory, e)) and e not in SKIP_FILES]

            for i, fname in enumerate(files):
                connector = "├── " if (i < len(files) - 1 or dirs) else "└── "
                lines.append(f"{prefix}{connector}{fname}")
                rel = os.path.relpath(os.path.join(directory, fname), repo_path).replace("\\", "/")
                file_paths.append(rel)

            for i, dname in enumerate(dirs):
                connector = "├── " if i < len(dirs) - 1 else "└── "
                lines.append(f"{prefix}{connector}{dname}/")
                extension = "│   " if i < len(dirs) - 1 else "    "
                _recurse(os.path.join(directory, dname), prefix + extension)

        _recurse(repo_path)
        return "\n".join(lines), file_paths

    # ------------------------------------------------------------------
    # Per-file documentation
    # ------------------------------------------------------------------

    async def _document_file(self, repo_path: str, rel_path: str) -> Optional[Dict[str, Any]]:
        abs_path = os.path.join(repo_path, rel_path)
        if not os.path.isfile(abs_path):
            return None

        size = os.path.getsize(abs_path)
        if size > MAX_FILE_SIZE:
            return {
                "path": rel_path,
                "language": self._detect_lang(rel_path),
                "summary": "File too large for inline documentation.",
                "sections": [],
            }

        try:
            with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                source = f.read()
        except Exception:
            return None

        if not source.strip():
            return {
                "path": rel_path,
                "language": self._detect_lang(rel_path),
                "summary": "Empty file.",
                "sections": [],
            }

        # Attempt AST parse for richer context
        lang = self._detect_lang(rel_path)
        ast_nodes = []
        if lang and lang not in {"text", "unknown"}:
            try:
                ext = os.path.splitext(rel_path)[1]
                if ext in LANGUAGE_EXTENSIONS:
                    ast_nodes = self.parser.parse_file(abs_path)
            except Exception:
                pass

        sections = await self._build_file_sections(rel_path, source, lang, ast_nodes)
        summary = sections[0]["content"] if sections else ""

        return {
            "path": rel_path,
            "language": lang,
            "summary": summary,
            "sections": sections,
        }

    async def _build_file_sections(
        self, rel_path: str, source: str, lang: str, ast_nodes: list
    ) -> List[Dict[str, str]]:
        """Ask LLM to produce structured documentation sections for a file."""
        # Build AST summary if available
        ast_summary = ""
        if ast_nodes:
            parts = []
            for node in ast_nodes[:40]:  # cap at 40 nodes
                parts.append(f"- {node.node_type.value}: {node.name} (L{node.start_line}-{node.end_line})")
            ast_summary = "\n".join(parts)

        # Truncate very long files for the prompt
        src_for_prompt = source[:12000] if len(source) > 12000 else source

        prompt = f"""You are a senior software engineer writing internal documentation for an MNC.

Produce structured documentation for the file **{rel_path}** ({lang or 'unknown'}).

Rules:
- Return ONLY markdown.
- Start with a one-paragraph **Module Overview** (what this file does, why it exists).
- Then a **Dependencies** section listing imports / external deps.
- If there are classes, add a **Classes** section with a table: | Class | Purpose | Key Methods |
- If there are functions, add a **Functions** section with a table: | Function | Parameters | Returns | Description |
- If applicable, add **Configuration** or **Constants** section.
- End with a **Notes / Edge Cases** section if relevant.
- Be concise but thorough. Use professional tone.

{"AST Structure:\n" + ast_summary if ast_summary else ""}

Source code:
```{lang or ''}
{src_for_prompt}
```"""

        try:
            response = await self.llm.ainvoke([
                SystemMessage(content="You are a documentation engineer. Output only markdown."),
                HumanMessage(content=prompt),
            ])
            text = response.content.strip()
        except Exception as exc:
            logger.error("LLM documentation failed for %s: %s", rel_path, exc)
            text = f"## Module Overview\n\nDocumentation generation failed: {exc}"

        # Split LLM markdown into sections by ## headings
        return self._split_markdown_sections(text)

    @staticmethod
    def _split_markdown_sections(md: str) -> List[Dict[str, str]]:
        sections: List[Dict[str, str]] = []
        current_title = "Overview"
        current_lines: List[str] = []

        for line in md.split("\n"):
            if line.startswith("## "):
                if current_lines:
                    sections.append({"title": current_title, "content": "\n".join(current_lines).strip()})
                current_title = line.lstrip("# ").strip()
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            sections.append({"title": current_title, "content": "\n".join(current_lines).strip()})

        return sections

    # ------------------------------------------------------------------
    # High-level summaries
    # ------------------------------------------------------------------

    async def _generate_overview(
        self, repo_path: str, tree_str: str, file_docs: List[Dict]
    ) -> str:
        repo_name = os.path.basename(repo_path)
        file_summaries = "\n".join(
            f"- **{d['path']}**: {d['summary'][:120]}" for d in file_docs[:40]
        )
        prompt = f"""Write a professional **Project Overview** (3-5 paragraphs) for the repository "{repo_name}".

Folder structure:
```
{tree_str[:3000]}
```

File summaries:
{file_summaries[:4000]}

Include: purpose, tech stack, high-level architecture, and intended audience.
Output only markdown (no title heading needed)."""

        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content="You are a documentation engineer. Output only markdown."),
                HumanMessage(content=prompt),
            ])
            return resp.content.strip()
        except Exception as exc:
            logger.error("Overview generation failed: %s", exc)
            return f"Overview generation failed: {exc}"

    async def _generate_architecture(self, tree_str: str, file_docs: List[Dict]) -> str:
        file_summaries = "\n".join(
            f"- **{d['path']}**: {d['summary'][:100]}" for d in file_docs[:40]
        )
        prompt = f"""Based on this repository structure and file summaries, write an **Architecture** section.

Structure:
```
{tree_str[:3000]}
```

Files:
{file_summaries[:4000]}

Cover: layers / modules, data flow, key design patterns, entry points.
Output only markdown (no title heading needed)."""

        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content="You are a documentation engineer. Output only markdown."),
                HumanMessage(content=prompt),
            ])
            return resp.content.strip()
        except Exception as exc:
            logger.error("Architecture generation failed: %s", exc)
            return f"Architecture generation failed: {exc}"

    async def _generate_dependencies(self, repo_path: str, file_docs: List[Dict]) -> str:
        # Try to read requirements.txt / package.json
        dep_files = {}
        for name in ("requirements.txt", "package.json", "pyproject.toml", "go.mod", "Cargo.toml"):
            p = os.path.join(repo_path, name)
            if os.path.isfile(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        dep_files[name] = f.read()[:4000]
                except Exception:
                    pass

        if not dep_files:
            return "No dependency manifest found."

        dep_text = "\n\n".join(f"**{k}**:\n```\n{v}\n```" for k, v in dep_files.items())
        prompt = f"""Analyze these dependency files and write a **Dependencies** section.

{dep_text}

Include: major libraries with their purpose, version constraints, dev vs prod deps.
Output only markdown (no title heading needed)."""

        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content="You are a documentation engineer. Output only markdown."),
                HumanMessage(content=prompt),
            ])
            return resp.content.strip()
        except Exception as exc:
            logger.error("Dependencies generation failed: %s", exc)
            return f"Dependency analysis failed: {exc}"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_lang(rel_path: str) -> str:
        ext = os.path.splitext(rel_path)[1].lower()
        if ext in LANGUAGE_EXTENSIONS:
            return LANGUAGE_EXTENSIONS[ext]
        if ext in TEXT_EXTENSIONS:
            return ext.lstrip(".")
        return "unknown"
