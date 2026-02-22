"""
Documentation Endpoints

Generate and retrieve structured MNC-standard documentation for repositories.
"""

import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import get_settings
from app.services.documentation_generator import DocumentationGenerator
from app.services.persistence import save_documentation_cache, load_documentation_cache

logger = logging.getLogger(__name__)
router = APIRouter()

# Load persisted documentation cache (survives server restarts)
docs_cache: dict = load_documentation_cache()
docs_generating: dict = {}     # repo_id -> bool
print(f"📂 Loaded documentation cache for {len(docs_cache)} repositories from disk")

doc_generator = DocumentationGenerator()


def _repo_path(repo_id: str) -> str:
    settings = get_settings()
    return f"{settings.repos_directory}/{repo_id}"


async def _generate_task(repo_id: str):
    """Background task that generates documentation and caches it."""
    try:
        path = _repo_path(repo_id)
        result = await doc_generator.generate_repository_docs(path)
        docs_cache[repo_id] = result
        save_documentation_cache(docs_cache)  # persist to disk
        logger.info("Documentation generated & saved for repo %s", repo_id)
    except Exception as exc:
        logger.error("Documentation generation failed for %s: %s", repo_id, exc)
        docs_cache[repo_id] = {
            "overview": f"Generation failed: {exc}",
            "architecture": "",
            "folder_tree": "",
            "files": [],
            "dependencies": "",
        }
        save_documentation_cache(docs_cache)  # persist even failures
    finally:
        docs_generating.pop(repo_id, None)


@router.post("/{repo_id}/generate")
async def generate_docs(repo_id: str, background_tasks: BackgroundTasks):
    """Kick off documentation generation in the background."""
    if docs_generating.get(repo_id):
        return {"status": "generating", "message": "Documentation is already being generated."}

    docs_generating[repo_id] = True
    docs_cache.pop(repo_id, None)  # clear stale cache
    background_tasks.add_task(_generate_task, repo_id)
    return {"status": "accepted", "message": "Documentation generation started."}


@router.get("/{repo_id}")
async def get_docs(repo_id: str):
    """
    Retrieve generated documentation.
    Returns 202 while generating, 404 if not yet requested, 200 with data.
    """
    if docs_generating.get(repo_id):
        return {"status": "generating"}

    if repo_id not in docs_cache:
        return {"status": "not_generated"}

    return {"status": "ready", "data": docs_cache[repo_id]}


@router.get("/{repo_id}/file")
async def get_file_docs(repo_id: str, path: str):
    """Generate documentation for a single file on demand."""
    repo_path = _repo_path(repo_id)
    try:
        result = await doc_generator.generate_file_docs(repo_path, path)
        return {"status": "ready", "data": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
