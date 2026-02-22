"""
File Management Endpoints
"""

import os
from typing import List, Optional, Dict, Any
import mimetypes

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import PlainTextResponse

from app.config import get_settings
from app.models.schemas import (
    FileNode,
    ASTNode,
    DependencyGraph,
    ImpactAnalysisResponse,
    CodebaseImpactResponse,
    FileImpactSummary,
    NodeType,
)
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.repositories import repositories_db, should_ignore

router = APIRouter()
settings = get_settings()

# Language mappings based on file extensions
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".cs": "csharp",
    ".vue": "vue",
    ".svelte": "svelte",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    ".less": "less",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".sql": "sql",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "zsh",
    ".dockerfile": "dockerfile",
}


def get_language(file_path: str) -> Optional[str]:
    """Determine language from file extension"""
    _, ext = os.path.splitext(file_path.lower())
    return LANGUAGE_MAP.get(ext)


def _sanitize_repo_path(repo_root: str, path: str) -> tuple:
    safe_path = os.path.normpath(path).lstrip(os.sep).lstrip("/")
    full_path = os.path.join(repo_root, safe_path)
    repo_root_abs = os.path.abspath(repo_root)
    full_path_abs = os.path.abspath(full_path)

    if os.path.commonpath([repo_root_abs, full_path_abs]) != repo_root_abs:
        raise HTTPException(status_code=403, detail="Access denied")

    return safe_path, full_path


def _escape_mermaid_label(text: str) -> str:
    """Escape characters that break Mermaid flowchart label syntax."""
    text = text.replace("\\", "/")            # backslash → forward slash
    text = text.replace('"', "'")             # double quote
    # Use Unicode escapes to avoid interfering with Mermaid syntax
    for ch, repl in [
        ("(", "❨"), (")", "❩"),   # parentheses → fullwidth
        ("[", "⟦"), ("]", "⟧"),   # square brackets
        ("{", "❴"), ("}", "❵"),   # curly braces
        ("|", "│"),               # pipe
        ("#", "﹟"),              # hash
        ("<", "‹"), (">", "›"),   # angle brackets
    ]:
        text = text.replace(ch, repl)
    return text


def _find_symbol_context(file_path: str, safe_path: str, symbol: str) -> Optional[Dict[str, Any]]:
    from app.services.parser import ParserService

    parser = ParserService()
    language = parser.detect_language(safe_path)

    if not language or parser.is_text_language(language):
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        return None

    try:
        ast_nodes = parser.parse_file(content, language, safe_path)
    except Exception:
        return None

    def walk(nodes: List[ASTNode]) -> Optional[ASTNode]:
        for node in nodes:
            if node.type in {NodeType.FUNCTION, NodeType.METHOD, NodeType.CLASS} and node.name == symbol:
                return node
            found = walk(node.children or [])
            if found:
                return found
        return None

    node = walk(ast_nodes)
    if node:
        return {
            "found": True,
            "name": node.name,
            "type": node.type.value,
            "start_line": node.start_line,
            "end_line": node.end_line,
            "parameters": node.parameters or [],
        }

    lowered = symbol.lower()

    def walk_case_insensitive(nodes: List[ASTNode]) -> Optional[ASTNode]:
        for node in nodes:
            if node.type in {NodeType.FUNCTION, NodeType.METHOD, NodeType.CLASS} and node.name.lower() == lowered:
                return node
            found = walk_case_insensitive(node.children or [])
            if found:
                return found
        return None

    node = walk_case_insensitive(ast_nodes)
    if not node:
        return None

    return {
        "found": True,
        "name": node.name,
        "type": node.type.value,
        "start_line": node.start_line,
        "end_line": node.end_line,
        "parameters": node.parameters or [],
    }


def _calculate_risk_score(
    total_affected: int,
    direct_dependents_count: int,
    has_cycles: bool,
    symbol_selected: bool,
) -> int:
    score = 0
    score += min(total_affected * 8, 60)
    score += min(direct_dependents_count * 10, 25)
    if has_cycles:
        score += 15
    if symbol_selected:
        score = max(0, score - 10)
    return max(0, min(score, 100))


def _risk_level(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def _build_refactor_steps(
    target_file: str,
    symbol: Optional[str],
    direct_dependents: List[str],
    affected_files: List[str],
    has_cycles: bool,
) -> List[str]:
    target = f"`{symbol}` in `{target_file}`" if symbol else f"`{target_file}`"
    steps = [
        f"Create a short-lived branch and add/confirm baseline tests for {target}.",
        f"Apply the change in {target} with backward-compatible signatures where possible.",
    ]

    if direct_dependents:
        sample = ", ".join(f"`{p}`" for p in direct_dependents[:3])
        ellipsis = "\u2026" if len(direct_dependents) > 3 else ""
        steps.append(
            f"Update direct dependents first ({sample}{ellipsis}) and run targeted unit tests."
        )
    else:
        steps.append("No direct dependents detected; proceed with focused regression tests on the edited file.")

    if affected_files:
        steps.append(
            f"Run integration tests for the broader blast radius ({len(affected_files)} affected file(s))."
        )

    if has_cycles:
        steps.append("Address detected circular dependency paths before final refactor cleanup to reduce rollback risk.")

    steps.append("Re-index the repository and regenerate walkthrough/diagrams to validate the updated architecture narrative.")
    return steps


def _build_impact_brief(
    target_file: str,
    symbol: Optional[str],
    total_affected: int,
    direct_dependents_count: int,
    risk_level: str,
) -> str:
    target = f"{symbol} in {target_file}" if symbol else target_file
    return (
        f"Impact briefing for {target}. "
        f"This change has {direct_dependents_count} direct dependent file"
        f"{'' if direct_dependents_count == 1 else 's'} and {total_affected} total affected file"
        f"{'' if total_affected == 1 else 's'}. "
        f"Overall change risk is {risk_level}. "
        "Apply the refactor in small commits, validate direct dependents first, then run broader integration checks."
    )


def _short_name(path: str) -> str:
    """Return the filename with parent dir for context."""
    parts = path.replace("\\", "/").split("/")
    if len(parts) >= 2:
        return f"{parts[-2]}/{parts[-1]}"
    return parts[-1]


def _build_impact_mermaid(
    target_file: str,
    direct_dependents: List[str],
    affected_files: List[str],
) -> str:
    lines = ["flowchart LR"]
    target_label = _escape_mermaid_label(_short_name(target_file))
    lines.append(f'    target["{target_label}"]')
    lines.append("    style target fill:#0f172a,stroke:#3b82f6,color:#93c5fd,stroke-width:2px")

    if not direct_dependents:
        lines.append('    none["No direct dependents"]')
        lines.append("    target --> none")
        return "\n".join(lines)

    max_direct = 8
    max_affected = 10
    displayed_direct = direct_dependents[:max_direct]

    # Direct dependents
    for i, dep in enumerate(displayed_direct):
        dep_id = f"dep_{i}"
        label = _escape_mermaid_label(_short_name(dep))
        lines.append(f'    {dep_id}["{label}"]')
        lines.append(f"    target --> {dep_id}")
        lines.append(f"    style {dep_id} fill:#1e293b,stroke:#f59e0b,color:#fcd34d")

    if len(direct_dependents) > max_direct:
        remaining = len(direct_dependents) - max_direct
        lines.append(f'    dep_more["+{remaining} more"]')
        lines.append("    target -.-> dep_more")
        lines.append("    style dep_more fill:#111827,stroke:#374151,color:#9ca3af")

    # Indirect affected (not in direct)
    direct_set = set(displayed_direct)
    indirect = [f for f in affected_files if f not in direct_set][:max_affected]
    for i, file_path in enumerate(indirect):
        ind_id = f"ind_{i}"
        label = _escape_mermaid_label(_short_name(file_path))
        lines.append(f'    {ind_id}["{label}"]')
        # Connect to a direct dep for hierarchy
        parent = f"dep_{i % len(displayed_direct)}" if displayed_direct else "target"
        lines.append(f"    {parent} -.-> {ind_id}")
        lines.append(f"    style {ind_id} fill:#111827,stroke:#6b7280,color:#9ca3af")

    remaining_indirect = len([f for f in affected_files if f not in direct_set]) - len(indirect)
    if remaining_indirect > 0:
        lines.append(f'    ind_more["+{remaining_indirect} more affected"]')
        lines.append("    target -.-> ind_more")
        lines.append("    style ind_more fill:#111827,stroke:#374151,color:#9ca3af")

    return "\n".join(lines)


# ===============================================================
# Codebase-wide impact helpers
# ===============================================================

def _build_codebase_mermaid(
    hotspots: List["FileImpactSummary"],
    most_imported: List[Dict[str, Any]],
) -> str:
    """Generate a Mermaid flowchart grouped by risk level with short labels."""
    lines = ["flowchart LR"]

    # Group hotspots by risk level
    high = [h for h in hotspots if h.risk_level == "high"][:6]
    medium = [h for h in hotspots if h.risk_level == "medium"][:5]
    low = [h for h in hotspots if h.risk_level == "low"][:4]

    lines.append('    root(("Codebase"))')
    lines.append("    style root fill:#0f172a,stroke:#3b82f6,color:#93c5fd,stroke-width:3px")

    # Risk-level hub nodes
    if high:
        lines.append('    rh{{"HIGH RISK"}}')
        lines.append("    style rh fill:#450a0a,stroke:#ef4444,color:#fca5a5,stroke-width:2px")
        lines.append("    root --> rh")
    if medium:
        lines.append('    rm{{"MEDIUM"}}')
        lines.append("    style rm fill:#422006,stroke:#eab308,color:#fde68a,stroke-width:2px")
        lines.append("    root --> rm")
    if low:
        lines.append('    rl{{"LOW"}}')
        lines.append("    style rl fill:#052e16,stroke:#22c55e,color:#86efac,stroke-width:2px")
        lines.append("    root --> rl")

    # High risk files
    for i, hs in enumerate(high):
        nid = f"h{i}"
        label = _escape_mermaid_label(_short_name(hs.file))
        score = hs.risk_score
        lines.append(f'    {nid}["{label}<br/><small>{score}/100</small>"]')
        lines.append(f"    rh --> {nid}")
        lines.append(f"    style {nid} fill:#1e293b,stroke:#ef4444,color:#fca5a5")

    # Medium risk files
    for i, hs in enumerate(medium):
        nid = f"m{i}"
        label = _escape_mermaid_label(_short_name(hs.file))
        score = hs.risk_score
        lines.append(f'    {nid}["{label}<br/><small>{score}/100</small>"]')
        lines.append(f"    rm --> {nid}")
        lines.append(f"    style {nid} fill:#1e293b,stroke:#eab308,color:#fde68a")

    # Low risk files
    for i, hs in enumerate(low):
        nid = f"l{i}"
        label = _escape_mermaid_label(_short_name(hs.file))
        score = hs.risk_score
        lines.append(f'    {nid}["{label}<br/><small>{score}/100</small>"]')
        lines.append(f"    rl --> {nid}")
        lines.append(f"    style {nid} fill:#1e293b,stroke:#22c55e,color:#86efac")

    # Show overflow count
    total_shown = len(high) + len(medium) + len(low)
    total_hotspots = len(hotspots)
    if total_hotspots > total_shown:
        remaining = total_hotspots - total_shown
        lines.append(f'    more["+{remaining} more files"]')
        lines.append("    root -.-> more")
        lines.append("    style more fill:#111827,stroke:#374151,color:#9ca3af")

    return "\n".join(lines)


def _build_codebase_brief(
    total_files: int,
    total_deps: int,
    overall_risk: str,
    hotspot_count: int,
    cycle_count: int,
) -> str:
    brief = (
        f"Codebase impact overview: {total_files} source files with {total_deps} internal dependencies. "
        f"Overall risk is {overall_risk}. "
    )
    if hotspot_count:
        brief += f"{hotspot_count} high-impact hotspot file{'s' if hotspot_count != 1 else ''} detected. "
    if cycle_count:
        brief += f"{cycle_count} circular dependency cycle{'s' if cycle_count != 1 else ''} found — resolve these first to lower risk. "
    brief += "Prioritize refactoring the hotspot files and break circular chains before large feature work."
    return brief


def _build_codebase_actions(
    hotspots: List["FileImpactSummary"],
    cycles: List[List[str]],
    is_dag: bool,
) -> List[str]:
    steps: List[str] = []
    if cycles:
        sample = ", ".join(f"`{' -> '.join(c)}`" for c in cycles[:2])
        steps.append(f"Break circular dependency cycles ({sample}) to reduce cascading risk.")
    if hotspots:
        top = ", ".join(f"`{h.file}`" for h in hotspots[:3])
        steps.append(f"Add regression tests around the highest-risk files: {top}.")
    steps.append("Consider extracting shared utility code into a dedicated module to lower coupling.")
    if not is_dag:
        steps.append("The dependency graph is not a DAG — refactoring toward a DAG structure improves build predictability.")
    steps.append("Re-index and regenerate walkthroughs/diagrams after structural changes to keep documentation current.")
    return steps


def build_file_tree(base_path: str, relative_path: str = "") -> List[FileNode]:
    """Recursively build file tree structure"""
    nodes = []
    current_path = os.path.join(base_path, relative_path) if relative_path else base_path
    
    try:
        entries = sorted(os.listdir(current_path))
    except PermissionError:
        return nodes
    
    # Separate directories and files
    dirs = []
    files = []
    
    for entry in entries:
        if entry.startswith("."):
            continue
        
        entry_relative = os.path.join(relative_path, entry) if relative_path else entry
        
        if should_ignore(entry_relative):
            continue
        
        full_path = os.path.join(current_path, entry)
        
        if os.path.isdir(full_path):
            dirs.append(entry)
        else:
            files.append(entry)
    
    # Add directories first
    for dir_name in dirs:
        dir_relative = os.path.join(relative_path, dir_name) if relative_path else dir_name
        dir_full = os.path.join(current_path, dir_name)
        
        node = FileNode(
            id=dir_relative.replace(os.sep, "_"),
            path=dir_relative.replace(os.sep, "/"),
            name=dir_name,
            is_directory=True,
            children=build_file_tree(base_path, dir_relative)
        )
        nodes.append(node)
    
    # Add files
    for file_name in files:
        file_relative = os.path.join(relative_path, file_name) if relative_path else file_name
        file_full = os.path.join(current_path, file_name)
        
        try:
            size = os.path.getsize(file_full)
        except OSError:
            size = 0
        
        node = FileNode(
            id=file_relative.replace(os.sep, "_"),
            path=file_relative.replace(os.sep, "/"),
            name=file_name,
            is_directory=False,
            language=get_language(file_name),
            size=size,
        )
        nodes.append(node)
    
    return nodes


@router.get("/{repo_id}/tree", response_model=List[FileNode])
async def get_file_tree(repo_id: str, authorization: str = Header(None)):
    """Get repository file tree"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path or not os.path.exists(repo.local_path):
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    return build_file_tree(repo.local_path)


@router.get("/{repo_id}/content")
async def get_file_content(
    repo_id: str,
    path: str,
    authorization: str = Header(None)
) -> PlainTextResponse:
    """Get file content"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    # Sanitize path to prevent directory traversal
    safe_path = os.path.normpath(path).lstrip(os.sep).lstrip("/")
    full_path = os.path.join(repo.local_path, safe_path)
    
    # Ensure path is within repository
    if not os.path.abspath(full_path).startswith(os.path.abspath(repo.local_path)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    if os.path.isdir(full_path):
        raise HTTPException(status_code=400, detail="Cannot read directory")
    
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        return PlainTextResponse(content)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Binary file cannot be displayed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@router.get("/{repo_id}/ast")
async def get_file_ast(
    repo_id: str,
    path: str,
    authorization: str = Header(None)
) -> List[ASTNode]:
    """Get AST for a file"""
    from app.services.parser import ParserService
    
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    # Sanitize path
    safe_path = os.path.normpath(path).lstrip(os.sep).lstrip("/")
    full_path = os.path.join(repo.local_path, safe_path)
    
    if not os.path.exists(full_path) or os.path.isdir(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    language = get_language(safe_path)
    
    if not language:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    parser = ParserService()
    
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        ast_nodes = parser.parse_file(content, language, safe_path)
        return ast_nodes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")


@router.get("/{repo_id}/impact/codebase", response_model=CodebaseImpactResponse)
async def get_codebase_impact(
    repo_id: str,
    authorization: str = Header(None),
) -> CodebaseImpactResponse:
    """Analyze the impact profile of the entire codebase."""
    from app.services.dependency_analyzer import DependencyAnalyzer

    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    repo = repositories_db.get(repo_id)
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")

    analyzer = DependencyAnalyzer()

    try:
        analyzer.analyze_repository(repo.local_path)
        stats = analyzer.get_graph_stats()
        all_cycles = analyzer.find_circular_dependencies()
        most_imported = analyzer.get_most_imported_files(limit=15)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing codebase: {str(e)}")

    # Build per-file impact summaries
    all_nodes = stats.get("total_files", 0)
    hotspots: List[FileImpactSummary] = []

    if analyzer._graph is not None:
        for node in list(analyzer._graph.nodes()):
            raw = analyzer.get_impact_analysis(node)
            if isinstance(raw, dict) and raw.get("error"):
                continue
            dd = len(raw.get("direct_dependents", []))
            ta = raw.get("total_affected", 0)
            rs = _calculate_risk_score(
                total_affected=ta,
                direct_dependents_count=dd,
                has_cycles=any(node in c for c in all_cycles),
                symbol_selected=False,
            )
            hotspots.append(
                FileImpactSummary(
                    file=node,
                    direct_dependents=dd,
                    total_affected=ta,
                    risk_score=rs,
                    risk_level=_risk_level(rs),
                )
            )

    # Sort by risk descending
    hotspots.sort(key=lambda h: h.risk_score, reverse=True)

    # Overall risk = average of top hotspots (or 0)
    top_n = hotspots[:10] if hotspots else []
    overall_score = int(sum(h.risk_score for h in top_n) / len(top_n)) if top_n else 0
    overall_level = _risk_level(overall_score)

    most_imported_dicts = [
        {"file": f, "import_count": c} for f, c in most_imported
    ]

    mermaid = _build_codebase_mermaid(hotspots[:15], most_imported_dicts)
    brief = _build_codebase_brief(
        total_files=all_nodes,
        total_deps=stats.get("total_dependencies", 0),
        overall_risk=overall_level,
        hotspot_count=len([h for h in hotspots if h.risk_level == "high"]),
        cycle_count=len(all_cycles),
    )
    actions = _build_codebase_actions(
        hotspots=hotspots[:5],
        cycles=all_cycles,
        is_dag=stats.get("is_dag", True),
    )

    return CodebaseImpactResponse(
        total_files=all_nodes,
        total_dependencies=stats.get("total_dependencies", 0),
        is_dag=stats.get("is_dag", True),
        connected_components=stats.get("connected_components", 0),
        circular_dependencies=all_cycles,
        hotspots=hotspots[:20],
        most_imported=most_imported_dicts,
        overall_risk_score=overall_score,
        overall_risk_level=overall_level,
        recommended_actions=actions,
        brief_script=brief,
        impact_mermaid=mermaid,
    )


@router.get("/{repo_id}/impact", response_model=ImpactAnalysisResponse)
async def get_impact_analysis(
    repo_id: str,
    path: str,
    symbol: Optional[str] = None,
    authorization: str = Header(None),
) -> ImpactAnalysisResponse:
    from app.services.dependency_analyzer import DependencyAnalyzer

    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    repo = repositories_db.get(repo_id)
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")

    safe_path, full_path = _sanitize_repo_path(repo.local_path, path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    if os.path.isdir(full_path):
        raise HTTPException(status_code=400, detail="Impact analysis requires a file path")

    normalized_file = os.path.relpath(full_path, repo.local_path).replace(os.sep, "/")
    analyzer = DependencyAnalyzer()

    try:
        analyzer.analyze_repository(repo.local_path)
        raw_impact = analyzer.get_impact_analysis(normalized_file)
        dependency_chain = analyzer.get_dependency_chain(normalized_file, max_depth=4)
        all_cycles = analyzer.find_circular_dependencies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing impact: {str(e)}")

    if isinstance(raw_impact, dict) and raw_impact.get("error"):
        direct_dependents = []
        affected_files = []
        total_affected = 0
    else:
        direct_dependents = raw_impact.get("direct_dependents", [])
        affected_files = raw_impact.get("affected_files", [])
        total_affected = raw_impact.get("total_affected", len(affected_files))

    relevant_cycles = [cycle for cycle in all_cycles if normalized_file in cycle]
    has_cycles = len(relevant_cycles) > 0
    symbol_context = _find_symbol_context(full_path, safe_path, symbol) if symbol else None

    risk_score = _calculate_risk_score(
        total_affected=total_affected,
        direct_dependents_count=len(direct_dependents),
        has_cycles=has_cycles,
        symbol_selected=bool(symbol and symbol_context),
    )
    risk_lvl = _risk_level(risk_score)

    refactor_steps = _build_refactor_steps(
        target_file=normalized_file,
        symbol=symbol,
        direct_dependents=direct_dependents,
        affected_files=affected_files,
        has_cycles=has_cycles,
    )
    brief_script = _build_impact_brief(
        target_file=normalized_file,
        symbol=symbol if symbol_context else None,
        total_affected=total_affected,
        direct_dependents_count=len(direct_dependents),
        risk_level=risk_lvl,
    )
    impact_mermaid = _build_impact_mermaid(
        target_file=normalized_file,
        direct_dependents=direct_dependents,
        affected_files=affected_files,
    )

    return ImpactAnalysisResponse(
        target_file=normalized_file,
        symbol=symbol if symbol_context else None,
        symbol_context=symbol_context,
        direct_dependents=direct_dependents,
        affected_files=affected_files,
        total_affected=total_affected,
        dependency_chain=dependency_chain,
        circular_dependencies=relevant_cycles,
        risk_score=risk_score,
        risk_level=risk_lvl,
        recommended_refactor_steps=refactor_steps,
        brief_script=brief_script,
        impact_mermaid=impact_mermaid,
    )


@router.get("/{repo_id}/dependencies", response_model=DependencyGraph)
async def get_dependency_graph(
    repo_id: str,
    authorization: str = Header(None)
) -> DependencyGraph:
    """Get dependency graph for repository"""
    from app.services.dependency_analyzer import DependencyAnalyzer
    
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    analyzer = DependencyAnalyzer()
    
    try:
        graph = analyzer.analyze_repository(repo.local_path)
        return graph
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing dependencies: {str(e)}")

