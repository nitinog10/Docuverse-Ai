"""
Repository Management Endpoints
"""

import os
import shutil
import json
import asyncio
from datetime import datetime
from typing import List, Optional
import uuid
import fnmatch

from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Depends
import httpx
from git import Repo

from app.config import get_settings
from app.models.schemas import (
    Repository,
    RepositoryCreate,
    RepositoryResponse,
    APIResponse,
    FileNode,
    User,
)
from app.api.endpoints.auth import get_current_user, users_db

router = APIRouter()
settings = get_settings()

# In-memory repository store (replace with database in production)
repositories_db: dict[str, Repository] = {}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")

# Directories to ignore when indexing
IGNORE_PATTERNS = {
    "node_modules",
    ".git",
    "__pycache__",
    ".pytest_cache",
    "venv",
    "env",
    ".env",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "coverage",
    ".nyc_output",
    ".idea",
    ".vscode",
    ".DS_Store",
    "*.pyc",
    "*.pyo",
    "*.egg-info",
}


def _save_repositories():
    """Persist repositories to disk"""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, "repositories.json")
    data = {}
    for rid, repo in repositories_db.items():
        data[rid] = repo.model_dump()
        # Handle datetime serialization
        for key in ["created_at", "indexed_at"]:
            if data[rid].get(key):
                data[rid][key] = data[rid][key].isoformat()
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)


def _load_repositories():
    """Load repositories from disk"""
    filepath = os.path.join(DATA_DIR, "repositories.json")
    if not os.path.exists(filepath):
        return
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        for rid, rdata in data.items():
            repo = Repository(**rdata)
            # Verify local_path still exists
            if repo.local_path and not os.path.exists(repo.local_path):
                repo.local_path = None
                repo.status = "pending"
            repositories_db[rid] = repo
    except Exception:
        pass


# Load on module init
_load_repositories()


def should_ignore(path: str) -> bool:
    """Check if path should be ignored"""
    parts = path.split(os.sep)
    return any(part in IGNORE_PATTERNS for part in parts)


async def get_github_repos(access_token: str) -> List[dict]:
    """Fetch user's GitHub repositories"""
    repos = []
    page = 1
    
    async with httpx.AsyncClient() as client:
        while True:
            response = await client.get(
                f"https://api.github.com/user/repos?page={page}&per_page=100&sort=updated",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code != 200:
                break
            
            page_repos = response.json()
            if not page_repos:
                break
            
            repos.extend(page_repos)
            page += 1
            
            if len(page_repos) < 100:
                break
    
    return repos


async def clone_repository(repo: Repository, access_token: str):
    """Clone repository to local storage"""
    repos_dir = settings.repos_directory
    os.makedirs(repos_dir, exist_ok=True)

    local_path = os.path.join(repos_dir, repo.id)

    # Update status
    repo.status = "cloning"
    repositories_db[repo.id] = repo
    _save_repositories()

    try:
        # Remove existing directory if present
        if os.path.exists(local_path):
            shutil.rmtree(local_path)

        # Clone with token authentication in a thread to avoid blocking event loop
        clone_url = repo.clone_url.replace(
            "https://",
            f"https://x-access-token:{access_token}@"
        )

        await asyncio.to_thread(Repo.clone_from, clone_url, local_path, depth=1)

        # Update repository record on success
        repo.local_path = local_path
        repo.status = "cloned"
        repositories_db[repo.id] = repo
        _save_repositories()

    except Exception as e:
        repo.status = "error"
        repo.error_message = str(e)
        repositories_db[repo.id] = repo
        _save_repositories()


@router.get("/github", response_model=List[dict])
async def list_github_repos(user: User = Depends(get_current_user)):
    """List user's GitHub repositories"""
    repos = await get_github_repos(user.access_token)
    
    return [
        {
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "description": repo.get("description"),
            "language": repo.get("language"),
            "stars": repo.get("stargazers_count", 0),
            "updated_at": repo.get("updated_at"),
            "private": repo.get("private", False),
        }
        for repo in repos
    ]


@router.post("/connect", response_model=RepositoryResponse)
async def connect_repository(
    request: RepositoryCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Connect and clone a GitHub repository"""
    # Fetch repository info from GitHub
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{request.full_name}",
            headers={
                "Authorization": f"Bearer {user.access_token}",
                "Accept": "application/json"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        github_repo = response.json()
    
    # Create repository record
    repo_id = f"repo_{uuid.uuid4().hex[:12]}"
    repo = Repository(
        id=repo_id,
        user_id=user.id,
        github_repo_id=github_repo["id"],
        name=github_repo["name"],
        full_name=github_repo["full_name"],
        description=github_repo.get("description"),
        default_branch=github_repo.get("default_branch", "main"),
        language=github_repo.get("language"),
        clone_url=github_repo["clone_url"],
        status="cloning",
    )

    repositories_db[repo_id] = repo
    _save_repositories()

    # Clone repository in background
    background_tasks.add_task(clone_repository, repo, user.access_token)

    return RepositoryResponse(
        id=repo.id,
        name=repo.name,
        full_name=repo.full_name,
        description=repo.description,
        language=repo.language,
        is_indexed=repo.is_indexed,
        indexed_at=repo.indexed_at,
        status=repo.status,
        error_message=repo.error_message,
    )


@router.get("/", response_model=List[RepositoryResponse])
async def list_repositories(user: User = Depends(get_current_user)):
    """List connected repositories"""
    user_repos = [
        repo for repo in repositories_db.values()
        if repo.user_id == user.id
    ]
    
    return [
        RepositoryResponse(
            id=repo.id,
            name=repo.name,
            full_name=repo.full_name,
            description=repo.description,
            language=repo.language,
            is_indexed=repo.is_indexed,
            indexed_at=repo.indexed_at,
            status=repo.status,
            error_message=repo.error_message,
        )
        for repo in user_repos
    ]


@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(repo_id: str, user: User = Depends(get_current_user)):
    """Get repository details"""
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    return RepositoryResponse(
        id=repo.id,
        name=repo.name,
        full_name=repo.full_name,
        description=repo.description,
        language=repo.language,
        is_indexed=repo.is_indexed,
        indexed_at=repo.indexed_at,
        status=repo.status,
        error_message=repo.error_message,
    )


@router.post("/{repo_id}/index")
async def index_repository(
    repo_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Index repository for AI documentation"""
    from app.services.indexer import IndexerService

    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path or not os.path.exists(repo.local_path):
        raise HTTPException(status_code=400, detail="Repository not cloned yet")

    # Update status
    repo.status = "indexing"
    repositories_db[repo.id] = repo
    _save_repositories()

    # Start indexing in background
    indexer = IndexerService()
    background_tasks.add_task(indexer.index_repository, repo)

    return APIResponse(
        success=True,
        message="Repository indexing started"
    )


@router.delete("/{repo_id}")
async def delete_repository(repo_id: str, user: User = Depends(get_current_user)):
    """Delete a connected repository"""
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Remove local files
    if repo.local_path and os.path.exists(repo.local_path):
        shutil.rmtree(repo.local_path)

    # Remove from database
    del repositories_db[repo_id]
    _save_repositories()

    return APIResponse(success=True, message="Repository deleted")

