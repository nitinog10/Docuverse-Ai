"""
Diagram Generation Endpoints - Mermaid.js Integration
"""

import os
from typing import List, Optional
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Header, Depends

from app.config import get_settings
from app.models.schemas import (
    DiagramRequest,
    DiagramData,
    DiagramType,
    APIResponse,
    User,
)
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.repositories import repositories_db

router = APIRouter()
settings = get_settings()

# In-memory diagram store
diagrams_db: dict[str, DiagramData] = {}


@router.post("/generate", response_model=DiagramData)
async def generate_diagram(
    request: DiagramRequest,
    user: User = Depends(get_current_user)
):
    """Generate a Mermaid diagram for repository/file"""
    from app.services.diagram_generator import DiagramGeneratorService
    from app.services.parser import ParserService

    repo = repositories_db.get(request.repository_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    diagram_generator = DiagramGeneratorService()
    parser = ParserService()
    
    try:
        if request.file_path:
            # Generate diagram for specific file
            safe_path = os.path.normpath(request.file_path).lstrip(os.sep).lstrip("/")
            full_path = os.path.join(repo.local_path, safe_path)
            
            if not os.path.exists(full_path):
                raise HTTPException(status_code=404, detail="File not found")
            
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            language = parser.detect_language(safe_path)
            ast_nodes = parser.parse_file(content, language, safe_path) if language else []
            
            mermaid_code = diagram_generator.generate_file_diagram(
                file_path=safe_path,
                content=content,
                ast_nodes=ast_nodes,
                diagram_type=request.diagram_type,
            )
            
            title = f"{request.diagram_type.value} for {os.path.basename(safe_path)}"
            
        else:
            # Generate diagram for entire repository
            mermaid_code = await diagram_generator.generate_repository_diagram(
                repo_path=repo.local_path,
                diagram_type=request.diagram_type,
            )
            
            title = f"{request.diagram_type.value} for {repo.name}"
        
        diagram = DiagramData(
            id=f"diagram_{uuid.uuid4().hex[:12]}",
            type=request.diagram_type,
            title=title,
            mermaid_code=mermaid_code,
            source_file=request.file_path,
        )
        
        diagrams_db[diagram.id] = diagram
        
        return diagram
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating diagram: {str(e)}")


@router.get("/{diagram_id}", response_model=DiagramData)
async def get_diagram(diagram_id: str, user: User = Depends(get_current_user)):
    """Get a diagram by ID"""
    diagram = diagrams_db.get(diagram_id)
    
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    return diagram


@router.get("/repository/{repo_id}", response_model=List[DiagramData])
async def get_repository_diagrams(repo_id: str, user: User = Depends(get_current_user)):
    """Get all diagrams for a repository"""
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Return all diagrams (in production, filter by repo)
    return list(diagrams_db.values())


@router.delete("/{diagram_id}")
async def delete_diagram(diagram_id: str, user: User = Depends(get_current_user)):
    """Delete a diagram"""
    if diagram_id not in diagrams_db:
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    del diagrams_db[diagram_id]
    
    return APIResponse(success=True, message="Diagram deleted")


@router.post("/preview")
async def preview_diagram(mermaid_code: str, user: User = Depends(get_current_user)):
    """Preview a Mermaid diagram (validate syntax)"""
    # Basic syntax validation
    valid_starts = ["flowchart", "graph", "sequenceDiagram", "classDiagram", "erDiagram", "stateDiagram"]
    
    is_valid = any(mermaid_code.strip().startswith(start) for start in valid_starts)
    
    if not is_valid:
        return APIResponse(
            success=False,
            message="Invalid Mermaid syntax",
            data={"mermaid_code": mermaid_code}
        )
    
    return APIResponse(
        success=True,
        message="Valid Mermaid syntax",
        data={"mermaid_code": mermaid_code}
    )

