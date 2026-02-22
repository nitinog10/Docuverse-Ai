/**
 * DocuVerse API Client
 * 
 * Handles all communication with the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

class APIError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.data = data
  }
}

// Helper to get token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  // Always get fresh token from localStorage
  const token = getAuthToken()

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // Include cookies for session management
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Handle unauthorized errors - only clear token for auth-specific endpoints
    // to prevent transient errors from logging the user out
    if (response.status === 401) {
      const isAuthEndpoint = endpoint === '/auth/me' || endpoint === '/auth/verify'
      if (isAuthEndpoint && typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
    }
    
    throw new APIError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    )
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) return {} as T

  return JSON.parse(text)
}

// ============================================================
// Authentication
// ============================================================

export const auth = {
  getGitHubAuthUrl: () => request<{ auth_url: string; state: string }>('/auth/github'),
  
  getMe: () => request<{
    id: string
    username: string
    email: string | null
    avatar_url: string | null
  }>('/auth/me'),
  
  logout: () => request('/auth/logout', { method: 'POST' }),
  
  refresh: () => request<{
    token: string
    user: {
      id: string
      username: string
      email: string | null
      avatar_url: string | null
    }
  }>('/auth/refresh', { method: 'POST' }),
  
  verify: () => request<{
    valid: boolean
    user: {
      id: string
      username: string
      email: string | null
      avatar_url: string | null
    }
  }>('/auth/verify'),
}

// ============================================================
// Repositories
// ============================================================

export interface Repository {
  id: string
  name: string
  full_name: string
  description: string | null
  language: string | null
  is_indexed: boolean
  indexed_at: string | null
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stars: number
  updated_at: string
  private: boolean
}

export const repositories = {
  listGitHub: () => request<GitHubRepository[]>('/repositories/github'),
  
  connect: (fullName: string) =>
    request<Repository>('/repositories/connect', {
      method: 'POST',
      body: { full_name: fullName },
    }),
  
  list: () => request<Repository[]>('/repositories/'),
  
  get: (id: string) => request<Repository>(`/repositories/${id}`),
  
  index: (id: string) => request(`/repositories/${id}/index`, { method: 'POST' }),
  
  delete: (id: string) => request(`/repositories/${id}`, { method: 'DELETE' }),
}

// ============================================================
// Files
// ============================================================

export interface FileNode {
  id: string
  path: string
  name: string
  is_directory: boolean
  language: string | null
  size: number | null
  children: FileNode[]
}

export interface ASTNode {
  id: string
  type: string
  name: string
  start_line: number
  end_line: number
  docstring: string | null
  parameters: string[] | null
}

export const files = {
  getTree: (repoId: string) => request<FileNode[]>(`/files/${repoId}/tree`),
  
  getContent: async (repoId: string, path: string): Promise<string> => {
    const token = getAuthToken()
    
    const response = await fetch(
      `${API_BASE_URL}/files/${repoId}/content?path=${encodeURIComponent(path)}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      }
    )
    
    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
      throw new APIError('Failed to fetch file content', response.status)
    }
    
    return response.text()
  },
  
  getAST: (repoId: string, path: string) =>
    request<ASTNode[]>(`/files/${repoId}/ast?path=${encodeURIComponent(path)}`),

  getImpact: (repoId: string, path: string, symbol?: string) => {
    const symbolParam = symbol ? `&symbol=${encodeURIComponent(symbol)}` : ''
    return request<ImpactAnalysis>(
      `/files/${repoId}/impact?path=${encodeURIComponent(path)}${symbolParam}`
    )
  },

  getCodebaseImpact: (repoId: string) =>
    request<CodebaseImpact>(`/files/${repoId}/impact/codebase`),
}

// ============================================================
// Impact Analysis
// ============================================================

export interface FileImpactSummary {
  file: string
  direct_dependents: number
  total_affected: number
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | string
}

export interface CodebaseImpact {
  total_files: number
  total_dependencies: number
  is_dag: boolean
  connected_components: number
  circular_dependencies: string[][]
  hotspots: FileImpactSummary[]
  most_imported: { file: string; import_count: number }[]
  overall_risk_score: number
  overall_risk_level: 'low' | 'medium' | 'high' | string
  recommended_actions: string[]
  brief_script: string
  impact_mermaid: string
}

export interface ImpactAnalysis {
  target_file: string
  symbol: string | null
  symbol_context: {
    found: boolean
    name: string
    type: string
    start_line: number
    end_line: number
    parameters: string[]
  } | null
  direct_dependents: string[]
  affected_files: string[]
  total_affected: number
  dependency_chain: Record<string, string[]>
  circular_dependencies: string[][]
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | string
  recommended_refactor_steps: string[]
  brief_script: string
  impact_mermaid: string
}

// ============================================================
// Walkthroughs
// ============================================================

export interface ScriptSegment {
  id: string
  order: number
  text: string
  start_line: number
  end_line: number
  highlight_lines: number[]
  duration_estimate: number
}

export interface WalkthroughScript {
  id: string
  file_path: string
  title: string
  summary: string
  view_mode: 'developer' | 'manager'
  segments: ScriptSegment[]
  total_duration: number
}

export interface AudioWalkthrough {
  id: string
  file_path: string
  audio_segments: {
    id: string
    script_segment_id: string
    audio_url: string
    duration: number
    start_time: number
    end_time: number
  }[]
  full_audio_url: string | null
  total_duration: number
}

export const walkthroughs = {
  generate: (repositoryId: string, filePath: string, viewMode: 'developer' | 'manager' = 'developer') =>
    request<WalkthroughScript>('/walkthroughs/generate', {
      method: 'POST',
      body: {
        repository_id: repositoryId,
        file_path: filePath,
        view_mode: viewMode,
      },
    }),
  
  get: (id: string) => request<WalkthroughScript>(`/walkthroughs/${id}`),
  
  getAudio: (id: string) => request<AudioWalkthrough>(`/walkthroughs/${id}/audio`),
  
  getForFile: (repoId: string, filePath: string) =>
    request<WalkthroughScript[]>(`/walkthroughs/file/${repoId}?file_path=${encodeURIComponent(filePath)}`),
  
  delete: (id: string) => request(`/walkthroughs/${id}`, { method: 'DELETE' }),
}

// ============================================================
// Diagrams
// ============================================================

export interface Diagram {
  id: string
  type: 'flowchart' | 'classDiagram' | 'sequenceDiagram' | 'erDiagram'
  title: string
  mermaid_code: string
  source_file: string | null
}

export const diagrams = {
  generate: (repositoryId: string, diagramType: string, filePath?: string) =>
    request<Diagram>('/diagrams/generate', {
      method: 'POST',
      body: {
        repository_id: repositoryId,
        diagram_type: diagramType,
        file_path: filePath,
      },
    }),
  
  get: (id: string) => request<Diagram>(`/diagrams/${id}`),
  
  getForRepository: (repoId: string) =>
    request<Diagram[]>(`/diagrams/repository/${repoId}`),
}

// ============================================================
// Sandbox
// ============================================================

export interface SandboxResult {
  success: boolean
  output: string
  error: string | null
  execution_time: number
}

export const sandbox = {
  execute: (code: string, language: string, variables: Record<string, any> = {}) =>
    request<SandboxResult>('/sandbox/execute', {
      method: 'POST',
      body: { code, language, variables },
    }),
  
  getLanguages: () =>
    request<{ languages: string[]; details: Record<string, { extension: string; timeout: number }> }>(
      '/sandbox/languages'
    ),
  
  validate: (code: string, language: string) =>
    request<{ success: boolean; message: string }>('/sandbox/validate', {
      method: 'POST',
      body: { code, language, variables: {} },
    }),
}

// ============================================================
// Documentation
// ============================================================

export interface DocSection {
  title: string
  content: string
}

export interface FileDocumentation {
  path: string
  language: string
  summary: string
  sections: DocSection[]
}

export interface RepositoryDocumentation {
  overview: string
  architecture: string
  folder_tree: string
  files: FileDocumentation[]
  dependencies: string
}

export const documentation = {
  generate: (repoId: string) =>
    request<{ status: string; message: string }>(`/documentation/${repoId}/generate`, {
      method: 'POST',
    }),

  get: (repoId: string) =>
    request<{ status: string; data?: RepositoryDocumentation | null }>(
      `/documentation/${repoId}`
    ),

  getFile: (repoId: string, filePath: string) =>
    request<{ status: string; data: FileDocumentation }>(
      `/documentation/${repoId}/file?path=${encodeURIComponent(filePath)}`
    ),
}

// Export all APIs
export const api = {
  auth,
  repositories,
  files,
  walkthroughs,
  diagrams,
  sandbox,
  documentation,
}

export default api

