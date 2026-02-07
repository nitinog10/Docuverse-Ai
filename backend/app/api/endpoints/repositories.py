"""
Repository Management Endpoints
"""

import os
import shutil
from datetime import datetime
from typing import List, Optional
import uuid

from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
import httpx
from git import Repo

from app.config import get_settings
from app.models.schemas import (
    Repository,
    RepositoryCreate,
    RepositoryResponse,
    APIResponse,
    FileNode,
)
from app.api.endpoints.auth import get_current_user, users_db
from app.services.persistence import save_repositories, load_repositories

router = APIRouter()
settings = get_settings()

# Load repositories from persistence on startup
repositories_db: dict[str, Repository] = load_repositories()

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
    
    # Remove existing directory if present
    if os.path.exists(local_path):
        shutil.rmtree(local_path)
    
    # Clone with token authentication
    clone_url = repo.clone_url.replace(
        "https://",
        f"https://x-access-token:{access_token}@"
    )
    
    Repo.clone_from(clone_url, local_path, depth=1)
    
    # Update repository record
    repo.local_path = local_path
    repositories_db[repo.id] = repo
    
    # Save to persistence
    save_repositories(repositories_db)


@router.get("/github", response_model=List[dict])
async def list_github_repos(authorization: str = Header(None)):
    """List user's GitHub repositories"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
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
    authorization: str = Header(None)
):
    """Connect and clone a GitHub repository"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
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
    )
    
    repositories_db[repo_id] = repo
    
    # Save to persistence
    save_repositories(repositories_db)
    
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
    )


@router.get("/", response_model=List[RepositoryResponse])
async def list_repositories(authorization: str = Header(None)):
    """List connected repositories"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
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
        )
        for repo in user_repos
    ]


@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(repo_id: str, authorization: str = Header(None)):
    """Get repository details"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
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
    )


@router.post("/{repo_id}/index")
async def index_repository(
    repo_id: str,
    background_tasks: BackgroundTasks,
    authorization: str = Header(None)
):
    """Index repository for AI documentation"""
    from app.services.indexer import IndexerService
    
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path or not os.path.exists(repo.local_path):
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    # Start indexing in background
    indexer = IndexerService()
    background_tasks.add_task(indexer.index_repository, repo)
    
    return APIResponse(
        success=True,
        message="Repository indexing started"
    )


@router.delete("/{repo_id}")
async def delete_repository(repo_id: str, authorization: str = Header(None)):
    """Delete a connected repository"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Remove local files
    if repo.local_path and os.path.exists(repo.local_path):
        shutil.rmtree(repo.local_path)
    
    # Remove from database
    del repositories_db[repo_id]
    
    # Save to persistence
    save_repositories(repositories_db)
    
    return APIResponse(success=True, message="Repository deleted")

