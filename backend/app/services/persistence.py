"""
Simple file-based persistence for repositories and users
"""

import json
import os
from typing import Dict, Optional
from datetime import datetime

from app.config import get_settings
from app.models.schemas import Repository, User

settings = get_settings()

# Persistence directory
PERSISTENCE_DIR = os.path.join(settings.repos_directory, ".persistence")
REPOS_FILE = os.path.join(PERSISTENCE_DIR, "repositories.json")
USERS_FILE = os.path.join(PERSISTENCE_DIR, "users.json")


def ensure_persistence_dir():
    """Ensure persistence directory exists"""
    os.makedirs(PERSISTENCE_DIR, exist_ok=True)


def save_repositories(repositories: Dict[str, Repository]):
    """Save repositories to file"""
    ensure_persistence_dir()
    
    # Convert Repository objects to dict
    repos_dict = {}
    for repo_id, repo in repositories.items():
        repos_dict[repo_id] = {
            "id": repo.id,
            "user_id": repo.user_id,
            "github_repo_id": repo.github_repo_id,
            "name": repo.name,
            "full_name": repo.full_name,
            "description": repo.description,
            "default_branch": repo.default_branch,
            "language": repo.language,
            "clone_url": repo.clone_url,
            "local_path": repo.local_path,
            "is_indexed": repo.is_indexed,
            "indexed_at": repo.indexed_at.isoformat() if repo.indexed_at else None,
            "created_at": repo.created_at.isoformat() if repo.created_at else None,
        }
    
    with open(REPOS_FILE, 'w') as f:
        json.dump(repos_dict, f, indent=2)


def load_repositories() -> Dict[str, Repository]:
    """Load repositories from file"""
    if not os.path.exists(REPOS_FILE):
        return {}
    
    try:
        with open(REPOS_FILE, 'r') as f:
            repos_dict = json.load(f)
        
        # Convert dict to Repository objects
        repositories = {}
        for repo_id, repo_data in repos_dict.items():
            # Parse datetime fields
            indexed_at = None
            if repo_data.get("indexed_at"):
                try:
                    indexed_at = datetime.fromisoformat(repo_data["indexed_at"])
                except:
                    pass
            
            created_at = datetime.utcnow()
            if repo_data.get("created_at"):
                try:
                    created_at = datetime.fromisoformat(repo_data["created_at"])
                except:
                    pass
            
            repositories[repo_id] = Repository(
                id=repo_data["id"],
                user_id=repo_data["user_id"],
                github_repo_id=repo_data["github_repo_id"],
                name=repo_data["name"],
                full_name=repo_data["full_name"],
                description=repo_data.get("description"),
                default_branch=repo_data.get("default_branch", "main"),
                language=repo_data.get("language"),
                clone_url=repo_data["clone_url"],
                local_path=repo_data.get("local_path"),
                is_indexed=repo_data.get("is_indexed", False),
                indexed_at=indexed_at,
                created_at=created_at,
            )
        
        return repositories
    except Exception as e:
        print(f"Error loading repositories: {e}")
        return {}


def save_users(users: Dict[str, User]):
    """Save users to file"""
    ensure_persistence_dir()
    
    # Convert User objects to dict
    users_dict = {}
    for user_id, user in users.items():
        users_dict[user_id] = {
            "id": user.id,
            "github_id": user.github_id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "access_token": user.access_token,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    
    with open(USERS_FILE, 'w') as f:
        json.dump(users_dict, f, indent=2)


def load_users() -> Dict[str, User]:
    """Load users from file"""
    if not os.path.exists(USERS_FILE):
        return {}
    
    try:
        with open(USERS_FILE, 'r') as f:
            users_dict = json.load(f)
        
        # Convert dict to User objects
        users = {}
        for user_id, user_data in users_dict.items():
            created_at = datetime.utcnow()
            if user_data.get("created_at"):
                try:
                    created_at = datetime.fromisoformat(user_data["created_at"])
                except:
                    pass
            
            users[user_id] = User(
                id=user_data["id"],
                github_id=user_data["github_id"],
                username=user_data["username"],
                email=user_data.get("email"),
                avatar_url=user_data.get("avatar_url"),
                access_token=user_data["access_token"],
                created_at=created_at,
            )
        
        return users
    except Exception as e:
        print(f"Error loading users: {e}")
        return {}
