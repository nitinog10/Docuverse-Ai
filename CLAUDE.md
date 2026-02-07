# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DocuVerse Ai — a generative media documentation engine that transforms codebases into interactive, audio-visual walkthroughs. Users connect a GitHub repo, select a file, and an AI "Senior Engineer" narrates the code logic with synced audio playback and auto-highlighting (the "Auto-Cast" feature).

## Development Commands

### Backend (FastAPI, Python 3.10+)
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then fill in API keys

# Run dev server
uvicorn app.main:app --reload --port 8000

# Swagger docs available at http://localhost:8000/api/docs
```

### Frontend (Next.js 14, TypeScript)
```bash
cd frontend
npm install
npm run dev      # Dev server on port 3000
npm run build    # Production build
npm run lint     # ESLint
```

### Docker (full stack)
```bash
docker-compose up -d
# backend:8000, frontend:3000, postgres:5432, redis:6379, celery worker
```

## Architecture

Three-layer system: **Ingestion → Logic → Presentation**.

### Backend (`backend/app/`)
- **Entry point:** `main.py` — FastAPI app factory with lifespan that initializes VectorStore and Parser services on `app.state`
- **Config:** `config.py` — Pydantic settings loaded from `.env`
- **Routes:** `api/routes.py` aggregates 6 endpoint modules under `/api`:
  - `auth.py` — GitHub OAuth, JWT tokens, in-memory user store
  - `repositories.py` — Clone repos to local filesystem, trigger indexing
  - `files.py` — File tree, raw content, AST, dependency graph
  - `walkthroughs.py` — Generate/retrieve walkthrough scripts and stream audio
  - `diagrams.py` — Generate Mermaid diagrams from code
  - `sandbox.py` — Execute code in isolated environment
- **Services:**
  - `parser.py` — Tree-sitter AST parsing (Python, JS, TS, Java, Go, Rust)
  - `vector_store.py` — ChromaDB for code chunk embeddings
  - `script_generator.py` — LangChain + GPT-4o walkthrough narration
  - `audio_generator.py` — pyttsx3 text-to-speech (offline)
  - `indexer.py` — Walks repo files, parses and stores chunks in ChromaDB
  - `dependency_analyzer.py` — Builds file dependency DAG
  - `diagram_generator.py` — Produces Mermaid diagram code
- **Models:** `models/schemas.py` — 60+ Pydantic models for all API contracts

### Frontend (`frontend/src/`)
- **Routing:** Next.js App Router (`app/` directory)
  - `/` — Landing page
  - `/dashboard` — Main dashboard
  - `/repository/[id]` — Repository view with file explorer
  - `/repository/[id]/walkthrough` — Auto-Cast walkthrough player
  - `/auth` — GitHub sign-in flow
  - `/walkthroughs` — Walkthrough history
  - `/settings` — User settings
- **State:** Zustand stores in `lib/store.ts` — `useUserStore`, `useWalkthroughStore`, `useRepositoryStore`, `useUIStore`
- **API client:** `lib/api.ts` — Centralized fetch with JWT auth header injection
- **Providers:** `app/providers.tsx` — NextAuth SessionProvider, React Query, Zustand hydration, toast notifications
- **Key components:** `components/walkthrough/WalkthroughPlayer.tsx` (main player), `FileExplorer.tsx`, `DiagramPanel.tsx`, `SandboxPanel.tsx`

### Data Flow
1. GitHub OAuth → JWT stored in localStorage
2. Repo connected → cloned to local `./repos/` → files parsed with Tree-sitter → chunks embedded in ChromaDB
3. Walkthrough: file AST + ChromaDB context → GPT-4o generates narration segments with line ranges → pyttsx3 generates audio → player syncs audio with code highlighting

### Frontend-Backend Connection
- Frontend calls backend at `http://localhost:8000/api` (configured via `NEXT_PUBLIC_API_URL`)
- Next.js rewrites `/api/backend/*` → `http://localhost:8000/api/*` (see `next.config.js`)
- CORS allows `http://localhost:3000`
- All endpoints except auth require `Authorization: Bearer <jwt>` header
- Errors follow `{ detail: "message" }` format

## Key Design Decisions
- **In-memory storage** for users/repos in development — no database required to run locally
- **Tree-sitter for AST parsing** (not regex) — provides accurate function/class/scope extraction
- **ChromaDB persists** to `./chroma_db/` directory
- **Two view modes** for walkthroughs: "developer" (technical) and "manager" (business summary)
- **pyttsx3 runs offline** — no external TTS API needed
- **Services use lazy initialization** — created in lifespan, accessed via `request.app.state`
- **TypeScript strict mode** enabled; path alias `@/*` maps to `src/*`
- **Styling:** Tailwind CSS with dark theme, DM Sans (UI) + JetBrains Mono (code), Framer Motion animations
