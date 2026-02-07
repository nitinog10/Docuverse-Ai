"""
Pydantic schemas for DocuVerse API
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================

class ViewMode(str, Enum):
    """Documentation view modes"""
    DEVELOPER = "developer"
    MANAGER = "manager"


class NodeType(str, Enum):
    """AST Node types"""
    FUNCTION = "function"
    CLASS = "class"
    METHOD = "method"
    VARIABLE = "variable"
    IMPORT = "import"
    MODULE = "module"


class DiagramType(str, Enum):
    """Mermaid diagram types"""
    FLOWCHART = "flowchart"
    CLASS_DIAGRAM = "classDiagram"
    SEQUENCE = "sequenceDiagram"
    ER_DIAGRAM = "erDiagram"


# ============================================================
# User Models
# ============================================================

class User(BaseModel):
    """User model"""
    id: str
    github_id: int
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    access_token: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(BaseModel):
    """User response (without sensitive data)"""
    id: str
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None


# ============================================================
# Repository Models
# ============================================================

class Repository(BaseModel):
    """Repository model"""
    id: str
    user_id: str
    github_repo_id: int
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str = "main"
    language: Optional[str] = None
    clone_url: str
    local_path: Optional[str] = None
    is_indexed: bool = False
    indexed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, cloning, cloned, indexing, indexed, error
    error_message: Optional[str] = None


class RepositoryCreate(BaseModel):
    """Repository creation request"""
    full_name: str  # e.g., "owner/repo-name"


class RepositoryResponse(BaseModel):
    """Repository response"""
    id: str
    name: str
    full_name: str
    description: Optional[str] = None
    language: Optional[str] = None
    is_indexed: bool
    indexed_at: Optional[datetime] = None
    status: str = "pending"  # pending, cloning, cloned, indexing, indexed, error
    error_message: Optional[str] = None


# ============================================================
# File & Code Models
# ============================================================

class FileNode(BaseModel):
    """File system node"""
    id: str
    path: str
    name: str
    is_directory: bool
    language: Optional[str] = None
    size: Optional[int] = None
    children: List["FileNode"] = []


class ASTNode(BaseModel):
    """Abstract Syntax Tree node"""
    id: str
    type: NodeType
    name: str
    start_line: int
    end_line: int
    start_col: int
    end_col: int
    docstring: Optional[str] = None
    parameters: Optional[List[str]] = None
    return_type: Optional[str] = None
    children: List["ASTNode"] = []
    metadata: Dict[str, Any] = {}


class CodeChunk(BaseModel):
    """Code chunk for vector storage"""
    id: str
    file_path: str
    content: str
    start_line: int
    end_line: int
    chunk_type: NodeType
    name: Optional[str] = None
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = {}


class DependencyEdge(BaseModel):
    """Dependency graph edge"""
    source: str  # File path
    target: str  # File path
    import_name: str
    is_external: bool = False


class DependencyGraph(BaseModel):
    """Dependency DAG for repository"""
    nodes: List[str]  # File paths
    edges: List[DependencyEdge]


# ============================================================
# Walkthrough Models
# ============================================================

class ScriptSegment(BaseModel):
    """Single segment of walkthrough script"""
    id: str
    order: int
    text: str
    start_line: int
    end_line: int
    highlight_lines: List[int] = []
    duration_estimate: float  # seconds
    code_context: Optional[str] = None


class WalkthroughScript(BaseModel):
    """Complete walkthrough script for a file"""
    id: str
    file_path: str
    title: str
    summary: str
    view_mode: ViewMode
    segments: List[ScriptSegment]
    total_duration: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}


class WalkthroughRequest(BaseModel):
    """Request to generate walkthrough"""
    repository_id: str
    file_path: str
    view_mode: ViewMode = ViewMode.DEVELOPER


# ============================================================
# Audio Models
# ============================================================

class AudioSegment(BaseModel):
    """Audio segment with timing info"""
    id: str
    script_segment_id: str
    audio_url: str
    duration: float  # seconds
    start_time: float  # seconds from beginning
    end_time: float


class AudioWalkthrough(BaseModel):
    """Complete audio walkthrough"""
    id: str
    walkthrough_script_id: str
    file_path: str
    audio_segments: List[AudioSegment]
    full_audio_url: Optional[str] = None
    total_duration: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Diagram Models
# ============================================================

class DiagramData(BaseModel):
    """Mermaid diagram data"""
    id: str
    type: DiagramType
    title: str
    mermaid_code: str
    source_file: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DiagramRequest(BaseModel):
    """Request to generate diagram"""
    repository_id: str
    file_path: Optional[str] = None
    diagram_type: DiagramType


# ============================================================
# Sandbox Models
# ============================================================

class SandboxExecutionRequest(BaseModel):
    """Request to execute code in sandbox"""
    code: str
    language: str
    variables: Dict[str, Any] = {}


class SandboxExecutionResult(BaseModel):
    """Sandbox execution result"""
    success: bool
    output: str
    error: Optional[str] = None
    execution_time: float  # milliseconds


# ============================================================
# API Response Models
# ============================================================

class APIResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """Paginated response"""
    items: List[Any]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


# Resolve forward references
FileNode.model_rebuild()
ASTNode.model_rebuild()

