# Impact Feature — Technical Deep Dive

## Overview

The **Change Impact Simulator** analyzes file dependencies across a codebase to answer: _"If I change this file, what breaks?"_ It computes risk scores, identifies hotspots, detects circular dependencies, and generates visual dependency graphs — all without any LLM/AI calls.

---

## Architecture

```
Frontend (ImpactPanel.tsx)
    │
    ├── files.getCodebaseImpact(repoId)     → GET /api/files/{repo_id}/impact/codebase
    └── files.getImpact(repoId, path, sym)  → GET /api/files/{repo_id}/impact?path=...&symbol=...
                │
                ▼
        Backend (files.py endpoints)
                │
                ├── DependencyAnalyzer.analyze_repository()   → Builds networkx DiGraph
                ├── DependencyAnalyzer.get_impact_analysis()  → Reverse BFS for affected files
                ├── DependencyAnalyzer.find_circular_dependencies() → nx.simple_cycles()
                ├── DependencyAnalyzer.get_graph_stats()      → Node/edge counts, DAG check
                ├── _calculate_risk_score()                   → Deterministic formula
                ├── _build_refactor_steps()                   → Template-generated steps
                ├── _build_impact_brief()                     → Template-generated narration
                └── _build_impact_mermaid()                   → Mermaid flowchart code
                        │
                        ▼
                Frontend renders response
                ├── Mermaid.js renders the graph SVG
                └── Browser SpeechSynthesis plays the brief
```

---

## Step-by-Step Flow

### Phase 1: Dependency Graph Construction

**File:** `backend/app/services/dependency_analyzer.py`  
**Class:** `DependencyAnalyzer`  
**Library:** `networkx.DiGraph`

1. **Walk the repo** — `os.walk()` scans all directories, skipping `node_modules`, `.git`, `__pycache__`, `venv`, `dist`, `build`, `.next`
2. **Filter source files** — Only files with these extensions are kept:
   - `.py` → Python
   - `.js`, `.jsx` → JavaScript
   - `.ts`, `.tsx` → TypeScript
3. **Add nodes** — Each source file path becomes a node in the directed graph
4. **Extract imports** — Regex patterns parse each file for imports:
   - **Python:** `import x` and `from x import y`
   - **JS/TS:** `import ... from 'path'` and `require('path')`
5. **Resolve imports** — Each import string is resolved to an actual repo file:
   - Python: `app.services.parser` → tries `app/services/parser.py` and `app/services/parser/__init__.py`
   - JS/TS: `./utils` → tries `./utils.js`, `./utils.ts`, `./utils.tsx`, `./utils/index.ts`, etc.
6. **Add edges** — If file A imports file B → directed edge `A → B`
   - External imports (e.g., `react`, `fastapi`) are recorded but not added as graph nodes

**Result:** A complete `networkx.DiGraph` where nodes = source files, edges = import relationships.

---

### Phase 2: Impact Analysis Computation

#### Single File Impact — `GET /{repo_id}/impact`

**File:** `backend/app/api/endpoints/files.py`

**Input:** `repo_id`, `path` (file), optional `symbol` (function/class name)

**Steps:**

1. **Auth & validation** — Verify JWT token, repo ownership, file existence
2. **Build graph** — `DependencyAnalyzer().analyze_repository(repo.local_path)`
3. **Reverse BFS** — `get_impact_analysis(file)`:
   - Start from the target file
   - Follow `predecessors` (files that import this file)
   - Recursively follow their predecessors
   - Collect all transitively affected files
   - Returns: `direct_dependents`, `affected_files`, `total_affected`
4. **Forward BFS** — `get_dependency_chain(file, max_depth=4)`:
   - Follow `successors` (files this file imports)
   - Returns dependency levels: `{level_1: [...], level_2: [...]}`
5. **Cycle detection** — `find_circular_dependencies()`:
   - Uses `nx.simple_cycles()` to find all loops
   - Filters to cycles involving the target file
6. **Symbol lookup** (optional) — `_find_symbol_context()`:
   - Uses **Tree-sitter** AST parsing to find the exact function/class node
   - Returns: `{name, type, start_line, end_line, parameters}`
7. **Risk scoring** — `_calculate_risk_score()`:
   ```
   score = 0
   score += min(total_affected × 8, 60)        # max 60 points from blast radius
   score += min(direct_dependents × 10, 25)     # max 25 points from direct deps
   if has_cycles: score += 15                    # penalty for circular deps
   if symbol_selected: score -= 10              # discount for narrow scope
   score = clamp(0, 100)
   ```
8. **Risk level** — `_risk_level(score)`:
   - `≥ 70` → **high**
   - `≥ 35` → **medium**
   - `< 35` → **low**
9. **Generate outputs** (all template-based, no LLM):
   - `_build_refactor_steps()` → Ordered list of refactoring recommendations
   - `_build_impact_brief()` → Narration text for audio playback
   - `_build_impact_mermaid()` → Mermaid flowchart code (LR layout, short labels)

**Response schema:** `ImpactAnalysisResponse`
```json
{
  "target_file": "src/lib/api.ts",
  "symbol": "fetchUser",
  "symbol_context": { "name": "fetchUser", "type": "function", "start_line": 42, "end_line": 58 },
  "direct_dependents": ["src/app/dashboard/page.tsx", "src/components/UserCard.tsx"],
  "affected_files": ["src/app/dashboard/page.tsx", "src/components/UserCard.tsx", "src/app/layout.tsx"],
  "total_affected": 3,
  "dependency_chain": { "level_1": ["src/lib/utils.ts"], "level_2": [] },
  "circular_dependencies": [],
  "risk_score": 49,
  "risk_level": "medium",
  "recommended_refactor_steps": ["Create a short-lived branch...", "Apply the change...", ...],
  "brief_script": "Impact briefing for fetchUser in src/lib/api.ts. This change has 2 direct dependent files...",
  "impact_mermaid": "flowchart LR\n    target[\"lib/api.ts\"]\n    ..."
}
```

---

#### Codebase Impact — `GET /{repo_id}/impact/codebase`

**Input:** `repo_id`

**Steps:**

1. **Build graph** + get stats, cycles, most-imported files
2. **Loop every node** in the graph:
   - Run `get_impact_analysis()` on each file
   - Compute risk score for each
   - Build `FileImpactSummary` per file
3. **Sort by risk** descending → top files are **hotspots**
4. **Overall risk** = average risk score of top 10 hotspot files
5. **Generate outputs:**
   - `_build_codebase_mermaid()` → Grouped by risk level (HIGH / MEDIUM / LOW hubs)
   - `_build_codebase_brief()` → Summary narration
   - `_build_codebase_actions()` → Prioritized action items

**Response schema:** `CodebaseImpactResponse`
```json
{
  "total_files": 135,
  "total_dependencies": 67,
  "is_dag": true,
  "connected_components": 84,
  "circular_dependencies": [],
  "hotspots": [
    { "file": "src/lib/api.ts", "direct_dependents": 8, "total_affected": 15, "risk_score": 85, "risk_level": "high" }
  ],
  "most_imported": [
    { "file": "src/lib/utils.ts", "import_count": 12 }
  ],
  "overall_risk_score": 52,
  "overall_risk_level": "medium",
  "recommended_actions": ["Refactor the top hotspot file...", ...],
  "brief_script": "Codebase impact overview: 135 source files with 67 internal dependencies...",
  "impact_mermaid": "flowchart LR\n    root((\"Codebase\"))\n    ..."
}
```

---

### Phase 3: Frontend Rendering

**File:** `frontend/src/components/walkthrough/ImpactPanel.tsx`

1.**API calls** — `files.getCodebaseImpact(repoId)` or `files.getImpact(repoId, path, symbol)` via the centralized API client in `lib/api.ts`
2. **Mode toggle** — User switches between "Codebase" and "Single File" analysis
3. **Data display:**
   - Risk badge (color-coded: red/yellow/green)
   - Stats grid (4 columns: files, dependencies, components, DAG status)
   - Brief text with audio playback via `window.speechSynthesis`
   - Recommended actions / refactor steps
   - Hotspot files table with risk scores
   - Most imported files list
   - Circular dependencies warnings
4. **Graph rendering:**
   - Mermaid code from backend is rendered client-side
   - Uses dynamic import: `const mermaid = (await import('mermaid')).default`
   - Initialized with dark theme, `securityLevel: 'loose'`, `htmlLabels: true`
   - SVG is injected into a container div at the bottom of the page
   - SVG is resized to fill container width (`width: 100%`, `minHeight: 380px`)
5. **Audio playback:**
   - Uses `SpeechSynthesisUtterance` API (browser-native, no backend TTS)
   - Play/Stop toggle button next to the brief text

---

## Risk Score Formula

```
                    ┌──────────────────────────────────────────┐
                    │         RISK SCORE (0–100)               │
                    │                                          │
                    │  Blast Radius:  total_affected × 8       │
                    │                 (capped at 60 pts)       │
                    │                                          │
                    │  Direct Deps:   direct_deps × 10         │
                    │                 (capped at 25 pts)       │
                    │                                          │
                    │  Cycle Penalty: +15 if circular deps     │
                    │                                          │
                    │  Symbol Bonus:  −10 if specific symbol   │
                    │                 (narrower scope)         │
                    │                                          │
                    │  ≥ 70 → HIGH  ≥ 35 → MEDIUM < 35 → LOW   │
                    └──────────────────────────────────────────┘
```

---

## Mermaid Graph Generation

### Codebase Graph (`_build_codebase_mermaid`)

Layout: `flowchart LR` (left-to-right)

Structure:
```
Codebase (circle) → HIGH RISK (diamond) → file1, file2, ...
                   → MEDIUM (diamond)    → file3, file4, ...
                   → LOW (diamond)       → file5, file6, ...
```

- Nodes grouped by risk level with color-coded borders (red/yellow/green)
- Each file node shows `parent/filename` and `score/100`
- Max 6 high, 5 medium, 4 low nodes (15 total)
- Overflow shown as "+N more files" node

### Single File Graph (`_build_impact_mermaid`)

Layout: `flowchart LR` (left-to-right)

Structure:
```
target_file → dep_0, dep_1, ... (direct dependents, yellow border)
              dep_0 -.-> ind_0, ind_1, ... (indirect affected, gray border)
```

- Target file highlighted in blue
- Direct dependents (max 8) connected with solid arrows
- Indirect affected files (max 10) connected with dashed arrows to their "parent" direct dep
- Short labels: `parent/filename` instead of full path

### Label Escaping (`_escape_mermaid_label`)

Characters that break Mermaid syntax are replaced with Unicode lookalikes:
- `( )` → `❨ ❩`, `[ ]` → `⟦ ⟧`, `{ }` → `❴ ❵`
- `|` → `│`, `#` → `﹟`, `< >` → `‹ ›`
- `\` → `/`, `"` → `'`

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/services/dependency_analyzer.py` | Builds networkx DiGraph from repo imports |
| `backend/app/api/endpoints/files.py` | Impact endpoints, risk scoring, mermaid/brief generation |
| `backend/app/models/schemas.py` | `ImpactAnalysisResponse`, `CodebaseImpactResponse`, `FileImpactSummary` |
| `frontend/src/lib/api.ts` | `ImpactAnalysis`, `CodebaseImpact` types + API methods |
| `frontend/src/components/walkthrough/ImpactPanel.tsx` | Full-page UI with mode toggle, graph, stats, audio |
| `frontend/src/app/repository/[id]/walkthrough/page.tsx` | Integrates ImpactPanel as full-width when Impact tab active |

---

## Performance Characteristics

- **No LLM calls** — All computation is local (graph algorithms + templates)
- **No database** — Graph is built fresh per request (in-memory)
- **Speed** — Typically < 2 seconds for repos with 100–200 source files
- **Graph library** — networkx handles cycle detection, BFS, stats efficiently
- **Mermaid rendering** — Client-side SVG generation, no server rendering needed
- **Audio** — Browser-native `SpeechSynthesis`, no TTS API required
