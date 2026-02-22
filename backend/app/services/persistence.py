"""
Simple file-based persistence for repositories, users, walkthroughs, and documentation
"""

import json
import os
import base64
from typing import Dict, Optional, Any, List
from datetime import datetime

from app.config import get_settings
from app.models.schemas import (
    Repository, User,
    WalkthroughScript, ScriptSegment, ViewMode,
    AudioWalkthrough, AudioSegment,
)

settings = get_settings()

# Persistence directory
PERSISTENCE_DIR = os.path.join(settings.repos_directory, ".persistence")
REPOS_FILE = os.path.join(PERSISTENCE_DIR, "repositories.json")
USERS_FILE = os.path.join(PERSISTENCE_DIR, "users.json")
WALKTHROUGHS_FILE = os.path.join(PERSISTENCE_DIR, "walkthroughs.json")
AUDIO_WALKTHROUGHS_FILE = os.path.join(PERSISTENCE_DIR, "audio_walkthroughs.json")
AUDIO_BYTES_DIR = os.path.join(PERSISTENCE_DIR, "audio_bytes")
DOCS_CACHE_FILE = os.path.join(PERSISTENCE_DIR, "documentation_cache.json")


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


# ============================================================
# Walkthrough Persistence
# ============================================================

def save_walkthroughs(walkthroughs: Dict[str, WalkthroughScript]):
    """Save walkthrough scripts to file"""
    ensure_persistence_dir()

    data = {}
    for wt_id, wt in walkthroughs.items():
        data[wt_id] = {
            "id": wt.id,
            "file_path": wt.file_path,
            "title": wt.title,
            "summary": wt.summary,
            "view_mode": wt.view_mode.value,
            "segments": [
                {
                    "id": seg.id,
                    "order": seg.order,
                    "text": seg.text,
                    "start_line": seg.start_line,
                    "end_line": seg.end_line,
                    "highlight_lines": seg.highlight_lines,
                    "duration_estimate": seg.duration_estimate,
                    "code_context": seg.code_context,
                }
                for seg in wt.segments
            ],
            "total_duration": wt.total_duration,
            "created_at": wt.created_at.isoformat() if wt.created_at else None,
            "metadata": wt.metadata,
        }

    with open(WALKTHROUGHS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_walkthroughs() -> Dict[str, WalkthroughScript]:
    """Load walkthrough scripts from file"""
    if not os.path.exists(WALKTHROUGHS_FILE):
        return {}

    try:
        with open(WALKTHROUGHS_FILE, "r") as f:
            data = json.load(f)

        walkthroughs: Dict[str, WalkthroughScript] = {}
        for wt_id, wt_data in data.items():
            created_at = datetime.utcnow()
            if wt_data.get("created_at"):
                try:
                    created_at = datetime.fromisoformat(wt_data["created_at"])
                except Exception:
                    pass

            segments = [
                ScriptSegment(
                    id=seg["id"],
                    order=seg["order"],
                    text=seg["text"],
                    start_line=seg["start_line"],
                    end_line=seg["end_line"],
                    highlight_lines=seg.get("highlight_lines", []),
                    duration_estimate=seg.get("duration_estimate", 0),
                    code_context=seg.get("code_context"),
                )
                for seg in wt_data.get("segments", [])
            ]

            walkthroughs[wt_id] = WalkthroughScript(
                id=wt_data["id"],
                file_path=wt_data["file_path"],
                title=wt_data["title"],
                summary=wt_data["summary"],
                view_mode=ViewMode(wt_data.get("view_mode", "developer")),
                segments=segments,
                total_duration=wt_data.get("total_duration", 0),
                created_at=created_at,
                metadata=wt_data.get("metadata", {}),
            )

        return walkthroughs
    except Exception as e:
        print(f"Error loading walkthroughs: {e}")
        return {}


# ============================================================
# Audio Walkthrough Persistence
# ============================================================

def save_audio_walkthroughs(audio_walkthroughs: Dict[str, AudioWalkthrough]):
    """Save audio walkthrough metadata to file"""
    ensure_persistence_dir()

    data = {}
    for aw_id, aw in audio_walkthroughs.items():
        data[aw_id] = {
            "id": aw.id,
            "walkthrough_script_id": aw.walkthrough_script_id,
            "file_path": aw.file_path,
            "audio_segments": [
                {
                    "id": seg.id,
                    "script_segment_id": seg.script_segment_id,
                    "audio_url": seg.audio_url,
                    "duration": seg.duration,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                }
                for seg in aw.audio_segments
            ],
            "full_audio_url": aw.full_audio_url,
            "total_duration": aw.total_duration,
            "created_at": aw.created_at.isoformat() if aw.created_at else None,
        }

    with open(AUDIO_WALKTHROUGHS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_audio_walkthroughs() -> Dict[str, AudioWalkthrough]:
    """Load audio walkthrough metadata from file"""
    if not os.path.exists(AUDIO_WALKTHROUGHS_FILE):
        return {}

    try:
        with open(AUDIO_WALKTHROUGHS_FILE, "r") as f:
            data = json.load(f)

        audio_walkthroughs: Dict[str, AudioWalkthrough] = {}
        for aw_id, aw_data in data.items():
            created_at = datetime.utcnow()
            if aw_data.get("created_at"):
                try:
                    created_at = datetime.fromisoformat(aw_data["created_at"])
                except Exception:
                    pass

            audio_segments = [
                AudioSegment(
                    id=seg["id"],
                    script_segment_id=seg["script_segment_id"],
                    audio_url=seg["audio_url"],
                    duration=seg["duration"],
                    start_time=seg["start_time"],
                    end_time=seg["end_time"],
                )
                for seg in aw_data.get("audio_segments", [])
            ]

            audio_walkthroughs[aw_id] = AudioWalkthrough(
                id=aw_data["id"],
                walkthrough_script_id=aw_data["walkthrough_script_id"],
                file_path=aw_data["file_path"],
                audio_segments=audio_segments,
                full_audio_url=aw_data.get("full_audio_url"),
                total_duration=aw_data.get("total_duration", 0),
                created_at=created_at,
            )

        return audio_walkthroughs
    except Exception as e:
        print(f"Error loading audio walkthroughs: {e}")
        return {}


def save_audio_bytes(audio_bytes_store: Dict[str, bytes]):
    """Save audio bytes to individual files on disk"""
    os.makedirs(AUDIO_BYTES_DIR, exist_ok=True)

    # Write a manifest of which walkthrough IDs have audio
    manifest = list(audio_bytes_store.keys())
    with open(os.path.join(AUDIO_BYTES_DIR, "manifest.json"), "w") as f:
        json.dump(manifest, f)

    for wt_id, audio_data in audio_bytes_store.items():
        audio_path = os.path.join(AUDIO_BYTES_DIR, f"{wt_id}.mp3")
        with open(audio_path, "wb") as f:
            f.write(audio_data)


def load_audio_bytes() -> Dict[str, bytes]:
    """Load audio bytes from disk"""
    manifest_path = os.path.join(AUDIO_BYTES_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        return {}

    try:
        with open(manifest_path, "r") as f:
            manifest = json.load(f)

        audio_bytes_store: Dict[str, bytes] = {}
        for wt_id in manifest:
            audio_path = os.path.join(AUDIO_BYTES_DIR, f"{wt_id}.mp3")
            if os.path.exists(audio_path):
                with open(audio_path, "rb") as f:
                    audio_bytes_store[wt_id] = f.read()

        return audio_bytes_store
    except Exception as e:
        print(f"Error loading audio bytes: {e}")
        return {}


def delete_audio_bytes(walkthrough_id: str):
    """Delete audio bytes file for a specific walkthrough"""
    audio_path = os.path.join(AUDIO_BYTES_DIR, f"{walkthrough_id}.mp3")
    if os.path.exists(audio_path):
        os.remove(audio_path)

    # Update manifest
    manifest_path = os.path.join(AUDIO_BYTES_DIR, "manifest.json")
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
            manifest = [wid for wid in manifest if wid != walkthrough_id]
            with open(manifest_path, "w") as f:
                json.dump(manifest, f)
        except Exception:
            pass


# ============================================================
# Documentation Cache Persistence
# ============================================================

def save_documentation_cache(docs_cache: Dict[str, Any]):
    """Save documentation cache to file"""
    ensure_persistence_dir()

    with open(DOCS_CACHE_FILE, "w") as f:
        json.dump(docs_cache, f, indent=2, default=str)


def load_documentation_cache() -> Dict[str, Any]:
    """Load documentation cache from file"""
    if not os.path.exists(DOCS_CACHE_FILE):
        return {}

    try:
        with open(DOCS_CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading documentation cache: {e}")
        return {}
