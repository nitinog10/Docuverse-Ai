'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  RefreshCw, 
  Download, 
  Maximize2,
  GitBranch,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { clsx } from 'clsx'

interface DiagramPanelProps {
  filePath: string
}

type DiagramType = 'flowchart' | 'class' | 'sequence'

// Mock Mermaid diagrams
const mockDiagrams: Record<DiagramType, string> = {
  flowchart: `flowchart TD
    A[authenticate_user] --> B{User exists?}
    B -->|Yes| C[verify_password]
    B -->|No| D[Return None]
    C -->|Valid| E[Return User]
    C -->|Invalid| D
    
    style A fill:#58a6ff,color:#fff
    style E fill:#3fb950,color:#fff
    style D fill:#f85149,color:#fff`,
  
  class: `classDiagram
    class User {
        +str email
        +str hashed_password
        +datetime created_at
        +verify_password()
    }
    
    class TokenData {
        +str email
        +datetime exp
    }
    
    class AuthService {
        +create_access_token()
        +authenticate_user()
        +get_current_user()
    }
    
    AuthService --> User
    AuthService --> TokenData`,
  
  sequence: `sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant Database
    
    Client->>API: POST /login
    API->>AuthService: authenticate_user()
    AuthService->>Database: get_user_by_email()
    Database-->>AuthService: User
    AuthService->>AuthService: verify_password()
    AuthService-->>API: User or None
    API->>AuthService: create_access_token()
    AuthService-->>API: JWT Token
    API-->>Client: 200 OK + Token`,
}

export function DiagramPanel({ filePath }: DiagramPanelProps) {
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart')
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderCountRef = useRef(0)

  useEffect(() => {
    renderDiagram()
    
    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [diagramType])

  const renderDiagram = async () => {
    if (!containerRef.current) return
    
    setIsLoading(true)
    
    // Clear previous content to prevent React conflicts
    containerRef.current.innerHTML = ''
    
    try {
      // Dynamic import of mermaid
      const mermaid = (await import('mermaid')).default
      
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#58a6ff',
          primaryTextColor: '#c9d1d9',
          primaryBorderColor: '#30363d',
          lineColor: '#8b949e',
          secondaryColor: '#21262d',
          tertiaryColor: '#161b22',
          background: '#0d1117',
          mainBkg: '#161b22',
          nodeBorder: '#30363d',
          clusterBkg: '#21262d',
          titleColor: '#c9d1d9',
          edgeLabelBackground: '#21262d',
        },
      })

      // Use unique ID for each render
      renderCountRef.current += 1
      const diagramId = `diagram-${renderCountRef.current}`
      
      const { svg } = await mermaid.render(diagramId, mockDiagrams[diagramType])
      
      // Only update if component is still mounted
      if (containerRef.current) {
        containerRef.current.innerHTML = svg
      }
    } catch (error) {
      console.error('Error rendering diagram:', error)
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full text-dv-text-muted">
            <p>Error rendering diagram</p>
          </div>
        `
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (!containerRef.current) return
    
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return
    
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `diagram-${diagramType}.svg`
    a.click()
    
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dv-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-dv-purple" />
            Diagrams
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={renderDiagram}
              className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={clsx(
                'w-4 h-4 text-dv-text-muted',
                isLoading && 'animate-spin'
              )} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
            >
              <Download className="w-4 h-4 text-dv-text-muted" />
            </button>
          </div>
        </div>

        {/* Diagram type selector */}
        <div className="flex gap-1 p-1 bg-dv-bg rounded-lg">
          {(['flowchart', 'class', 'sequence'] as DiagramType[]).map((type) => (
            <button
              key={type}
              onClick={() => setDiagramType(type)}
              className={clsx(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors capitalize',
                diagramType === type
                  ? 'bg-dv-elevated text-dv-text'
                  : 'text-dv-text-muted hover:text-dv-text'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Diagram container */}
      <div className="flex-1 overflow-auto p-4 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dv-bg z-10">
            <div className="flex items-center gap-2 text-dv-text-muted">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Generating diagram...</span>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className="min-h-[300px] flex items-center justify-center"
        />
      </div>

      {/* Info */}
      <div className="p-4 border-t border-dv-border">
        <p className="text-xs text-dv-text-muted">
          Diagrams are auto-generated from code analysis using Mermaid.js
        </p>
      </div>
    </div>
  )
}

