# DocuVerse Ai 🎬

**The World's First Generative Media Documentation Engine**

Transform complex codebases into interactive, audio-visual walkthroughs. Instead of reading 500 lines of code, press "Play" and watch as an AI "Senior Engineer" narrates the logic while the code automatically scrolls and highlights in real-time.


## ✨ Core Innovation: Auto-Cast

DocuVerse introduces **Auto-Cast** — a YouTube-style playback system for code documentation:

1. **User selects a file** (e.g., `auth_flow.py`)
2. **AI generates a step-by-step explanation**
3. **Audio narration syncs with code lines**
4. **Full playback controls** (Play / Pause / Seek / Speed)

## 🏗️ System Architecture

### Layer 1: Ingestion & Parsing Engine
- **Tree-sitter** for AST parsing (not regex)
- Function trees, class hierarchies, variable scopes
- **Dependency DAG** to understand file interactions
- Understands WHY code exists, not just syntax

### Layer 2: Logic Engine (RAG + Generation)
- **ChromaDB** for vector storage
- **Contextual Retrieval**: When documenting `Login.js`, retrieves related `UserSchema.js`
- Multi-view outputs:
  - **Developer Mode**: Inputs, Outputs, Complexity
  - **Manager Mode**: Business-level summaries

### Layer 3: Presentation Layer
- **Mermaid.js** for auto-generated diagrams
- Custom React-based player with:
  - Audio-code synchronization
  - Auto-scroll + syntax highlighting
  - Live Sandbox for code execution

## 🛠️ Tech Stack

| Component | Technology | Rationale |
|-----------|------------|----------|
| **Frontend** | Next.js + React | Fast rendering, SEO, Video Player UI |
| **Backend** | FastAPI (Python) | AI pipelines, Tree-sitter bindings |
| **Parsing** | Tree-sitter | Industry-standard, language agnostic |
| **AI Processing** | LangChain + GPT-4o | Chain of Thought reasoning |
| **Voice AI** | pyttsx3 | Offline TTS, no API key required |
| **Vector DB** | ChromaDB | Semantic code search |
| **Visualization** | Mermaid.js | Auto-generated diagrams |

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis (for background tasks)
- PostgreSQL (optional, for production)

### Backend Setup

**For Windows (PowerShell):**

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run this first:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Copy environment variables (PowerShell)
Copy-Item .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn app.main:app --reload --port 8000
```

**For Linux/Mac:**

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
SECRET_KEY=
# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback/github

# OpenAI
OPENAI_API_KEY=

# Text-to-Speech (optional - uses system defaults)
TTS_VOICE_ID=
TTS_RATE=150

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

## 📁 Project Structure

```
DocuVerseAI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/
│   │   │       ├── auth.py          # GitHub OAuth
│   │   │       ├── repositories.py  # Repo management
│   │   │       ├── files.py         # File operations
│   │   │       ├── walkthroughs.py  # Auto-Cast generation
│   │   │       ├── diagrams.py      # Mermaid.js diagrams
│   │   │       └── sandbox.py       # Code execution
│   │   ├── services/
│   │   │   ├── parser.py            # Tree-sitter parsing
│   │   │   ├── vector_store.py      # ChromaDB integration
│   │   │   ├── script_generator.py  # LangChain + GPT-4o
│   │   │   ├── audio_generator.py   # pyttsx3 TTS
│   │   │   ├── diagram_generator.py # Mermaid generation
│   │   │   ├── dependency_analyzer.py # DAG construction
│   │   │   └── indexer.py           # Repository indexing
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic models
│   │   ├── config.py                # App configuration
│   │   └── main.py                  # FastAPI entry point
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── dashboard/           # Main dashboard
│   │   │   ├── repository/          # Walkthrough player
│   │   │   └── auth/                # Authentication
│   │   ├── components/
│   │   │   ├── walkthrough/
│   │   │   │   ├── WalkthroughPlayer.tsx
│   │   │   │   ├── FileExplorer.tsx
│   │   │   │   ├── DiagramPanel.tsx
│   │   │   │   └── SandboxPanel.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── RepositoryCard.tsx
│   │   │   │   └── ConnectRepoModal.tsx
│   │   │   └── layout/
│   │   │       └── Sidebar.tsx
│   │   └── lib/
│   │       ├── api.ts               # API client
│   │       ├── store.ts             # Zustand stores
│   │       └── utils.ts             # Utility functions
│   ├── package.json
│   └── tailwind.config.ts
│
└── README.md
```

## 🎯 User Journey

1. **Connect**: User logs in via GitHub OAuth and selects a repository
2. **Analyze**: Backend clones repo, filters noise, builds AST + dependency graph
3. **Explore**: User sees a dashboard with file explorer
4. **Experience**: 
   - Click `payment_gateway.py`
   - Press "Play Walkthrough" button
   - AI voice explains while code scrolls automatically
5. **Verify**: Open "Live Sandbox", modify variables, run snippets instantly

## 🔌 API Endpoints

### Authentication
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/me` - Get current user

### Repositories
- `GET /api/repositories/github` - List GitHub repos
- `POST /api/repositories/connect` - Connect a repository
- `POST /api/repositories/{id}/index` - Index repository

### Files
- `GET /api/files/{repo_id}/tree` - Get file tree
- `GET /api/files/{repo_id}/content` - Get file content
- `GET /api/files/{repo_id}/ast` - Get AST for file

### Walkthroughs
- `POST /api/walkthroughs/generate` - Generate walkthrough
- `GET /api/walkthroughs/{id}` - Get walkthrough script
- `GET /api/walkthroughs/{id}/audio` - Get audio data

### Diagrams
- `POST /api/diagrams/generate` - Generate Mermaid diagram

### Sandbox
- `POST /api/sandbox/execute` - Execute code snippet

## 🎨 Design Philosophy

DocuVerse is designed with a **dark, modern IDE aesthetic**:

- Custom color palette inspired by GitHub Dark
- Smooth animations with Framer Motion
- Glass-morphism panels
- Gradient accents (blue → purple)
- JetBrains Mono for code, DM Sans for UI

## 🔮 Future Roadmap

- [ ] Multi-language support (beyond Python/JS/TS)
- [ ] Team collaboration features
- [ ] Custom voice training
- [ ] VS Code extension
- [ ] CI/CD integration (auto-update docs on PR)
- [ ] Interactive Q&A with codebase (RAG chatbot)


