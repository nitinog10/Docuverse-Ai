"""
Documentation Generation Endpoints
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Dict, Any

from app.config import get_settings
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.repositories import repositories_db
from app.services.documentation_generator import DocumentationGenerator

router = APIRouter()
settings = get_settings()

# In-memory documentation store
documentation_db: Dict[str, Dict[str, Any]] = {}


@router.post("/generate/{repo_id}")
async def generate_documentation(
    repo_id: str,
    authorization: str = Header(None)
):
    """Generate comprehensive documentation for a repository"""
    
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    try:
        doc_generator = DocumentationGenerator()
        documentation = await doc_generator.generate_repo_documentation(repo)
        
        # Store documentation
        documentation_db[repo_id] = documentation
        
        return {
            "success": True,
            "message": "Documentation generated successfully",
            "documentation": documentation,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating documentation: {str(e)}"
        )


@router.get("/{repo_id}")
async def get_documentation(
    repo_id: str,
    authorization: str = Header(None)
):
    """Get generated documentation for a repository"""
    
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    documentation = documentation_db.get(repo_id)
    
    if not documentation:
        raise HTTPException(
            status_code=404,
            detail="Documentation not generated yet. Generate it first."
        )
    
    return documentation


@router.delete("/{repo_id}")
async def delete_documentation(
    repo_id: str,
    authorization: str = Header(None)
):
    """Delete generated documentation"""
    
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if repo_id in documentation_db:
        del documentation_db[repo_id]
    
    return {
        "success": True,
        "message": "Documentation deleted"
    }
