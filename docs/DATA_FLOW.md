# DocuVerse Data Flow Diagram

## System Architecture Overview

```mermaid
flowchart TB
    subgraph Client["Frontend (Next.js)"]
        UI[React UI Components]
        Player[Walkthrough Player]
        FileExp[File Explorer]
        Sandbox[Live Sandbox]
        Diagrams[Mermaid Diagrams]
    end

    subgraph API["Backend (FastAPI)"]
        Auth[Auth Service]
        RepoMgr[Repository Manager]
        Parser[Tree-sitter Parser]
        ScriptGen[Script Generator]
        AudioGen[Audio Generator]
        DiagramGen[Diagram Generator]
        SandboxExec[Sandbox Executor]
    end

    subgraph Storage["Data Layer"]
        ChromaDB[(ChromaDB\nVector Store)]
        FileSystem[(Local\nFile System)]
        Redis[(Redis\nCache/Queue)]
    end

    subgraph External["External Services"]
        GitHub[GitHub API]
        OpenAI[OpenAI GPT-4o]
        pyttsx3[pyttsx3 TTS]
    end

    %% Client to API connections
    UI --> Auth
    UI --> RepoMgr
    Player --> ScriptGen
    Player --> AudioGen
    FileExp --> RepoMgr
    Sandbox --> SandboxExec
    Diagrams --> DiagramGen

    %% API to Storage
    Auth --> Redis
    RepoMgr --> FileSystem
    Parser --> ChromaDB
    ScriptGen --> ChromaDB

    %% API to External
    Auth --> GitHub
    RepoMgr --> GitHub
    ScriptGen --> OpenAI
    AudioGen --> pyttsx3

    style Client fill:#161b22,stroke:#58a6ff
    style API fill:#161b22,stroke:#a371f7
    style Storage fill:#161b22,stroke:#3fb950
    style External fill:#161b22,stroke:#d29922
```

## Detailed Data Flow

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant GitHub

    User->>Frontend: Click "Connect GitHub"
    Frontend->>Backend: GET /api/auth/github
    Backend-->>Frontend: GitHub OAuth URL
    Frontend->>GitHub: Redirect to OAuth
    User->>GitHub: Authorize app
    GitHub->>Frontend: Callback with code
    Frontend->>Backend: GET /api/auth/callback?code=xxx
    Backend->>GitHub: Exchange code for token
    GitHub-->>Backend: Access token
    Backend->>GitHub: GET /user
    GitHub-->>Backend: User info
    Backend-->>Frontend: JWT token
    Frontend->>Frontend: Store token, redirect to dashboard
```

### 2. Repository Indexing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant GitHub
    participant Parser
    participant ChromaDB

    User->>Frontend: Select repository
    Frontend->>Backend: POST /api/repositories/connect
    Backend->>GitHub: Clone repository
    GitHub-->>Backend: Repository files
    Backend->>Backend: Filter noise (node_modules, etc.)
    
    loop For each source file
        Backend->>Parser: Parse with Tree-sitter
        Parser-->>Backend: AST nodes
        Backend->>Backend: Create code chunks
        Backend->>ChromaDB: Store with embeddings
    end
    
    Backend-->>Frontend: Indexing complete
```

### 3. Walkthrough Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant Player
    participant Backend
    participant ChromaDB
    participant OpenAI
    participant pyttsx3

    User->>Player: Click "Play Walkthrough"
    Player->>Backend: POST /api/walkthroughs/generate
    
    Backend->>Backend: Parse file AST
    Backend->>ChromaDB: Get related context
    ChromaDB-->>Backend: Related code chunks
    
    loop For each code segment
        Backend->>OpenAI: Generate explanation
        OpenAI-->>Backend: Narration text
    end
    
    Backend-->>Player: Walkthrough script
    
    loop For each segment
        Player->>Backend: GET audio for segment
        Backend->>pyttsx3: Text-to-speech
        pyttsx3-->>Backend: Audio data
        Backend-->>Player: Audio segment
    end
    
    Player->>Player: Sync audio with code highlighting
```

### 4. Live Sandbox Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant Sandbox
    participant Backend
    participant Executor

    User->>Sandbox: Write/modify code
    User->>Sandbox: Click "Run"
    Sandbox->>Backend: POST /api/sandbox/execute
    
    Backend->>Backend: Sanitize code
    Backend->>Backend: Inject variables
    Backend->>Executor: Execute in isolated env
    
    alt Success
        Executor-->>Backend: Output
        Backend-->>Sandbox: { success: true, output }
    else Error
        Executor-->>Backend: Error
        Backend-->>Sandbox: { success: false, error }
    end
    
    Sandbox->>Sandbox: Display result
```

## Component Interaction Matrix

| Component | Reads From | Writes To | External Deps |
|-----------|-----------|-----------|---------------|
| Auth Service | Redis | Redis | GitHub OAuth |
| Repository Manager | GitHub, FileSystem | FileSystem, ChromaDB | GitHub API |
| Parser Service | FileSystem | ChromaDB | Tree-sitter |
| Script Generator | ChromaDB | Memory | OpenAI GPT-4o |
| Audio Generator | Memory | FileSystem | pyttsx3 (local) |
| Diagram Generator | ChromaDB, FileSystem | Memory | None |
| Sandbox Executor | Memory | Memory | Python/Node runtime |

## Data Models

### Core Entities

```mermaid
erDiagram
    USER {
        string id PK
        int github_id
        string username
        string email
        string access_token
        datetime created_at
    }
    
    REPOSITORY {
        string id PK
        string user_id FK
        int github_repo_id
        string name
        string full_name
        string local_path
        boolean is_indexed
        datetime indexed_at
    }
    
    WALKTHROUGH {
        string id PK
        string repository_id FK
        string file_path
        string title
        string view_mode
        float total_duration
        datetime created_at
    }
    
    SEGMENT {
        string id PK
        string walkthrough_id FK
        int order_num
        string text
        int start_line
        int end_line
        float duration
    }
    
    CODE_CHUNK {
        string id PK
        string repository_id FK
        string file_path
        string content
        string chunk_type
        vector embedding
    }
    
    USER ||--o{ REPOSITORY : owns
    REPOSITORY ||--o{ WALKTHROUGH : has
    WALKTHROUGH ||--o{ SEGMENT : contains
    REPOSITORY ||--o{ CODE_CHUNK : indexed_as
```

## API Contract Summary

### Authentication
- `GET /api/auth/github` → OAuth initiation
- `GET /api/auth/github/callback` → OAuth callback
- `GET /api/auth/me` → Current user info

### Repositories
- `GET /api/repositories/github` → List GitHub repos
- `POST /api/repositories/connect` → Connect repo
- `GET /api/repositories/` → List connected repos
- `POST /api/repositories/{id}/index` → Index repo

### Files
- `GET /api/files/{repo_id}/tree` → File tree
- `GET /api/files/{repo_id}/content` → File content
- `GET /api/files/{repo_id}/ast` → AST analysis

### Walkthroughs
- `POST /api/walkthroughs/generate` → Generate walkthrough
- `GET /api/walkthroughs/{id}` → Get script
- `GET /api/walkthroughs/{id}/audio` → Get audio

### Diagrams
- `POST /api/diagrams/generate` → Generate diagram

### Sandbox
- `POST /api/sandbox/execute` → Run code
- `GET /api/sandbox/languages` → Supported languages

