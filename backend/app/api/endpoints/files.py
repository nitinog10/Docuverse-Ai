"""
File Management Endpoints
"""

import os
from typing import List, Optional
import mimetypes

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import PlainTextResponse

from app.config import get_settings
from app.models.schemas import FileNode, ASTNode, DependencyGraph
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

