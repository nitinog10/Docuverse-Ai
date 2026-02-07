'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  RefreshCw, 
  Download, 
  Layers,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { diagrams } from '@/lib/api'
import toast from 'react-hot-toast'

interface DiagramPanelProps {
  repositoryId: string
  filePath: string
}

type DiagramType = 'flowchart' | 'classDiagram' | 'sequenceDiagram'

const DIAGRAM_LABELS: Record<DiagramType, string> = {
  flowchart: 'Flow',
  classDiagram: 'Class',
  sequenceDiagram: 'Sequence',
}

export function DiagramPanel({ repositoryId, filePath }: DiagramPanelProps) {
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart')
  const [mermaidCode, setMermaidCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderCountRef = useRef(0)

  const generateDiagram = async () => {
    if (!filePath) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await diagrams.generate(repositoryId, diagramType, filePath)
      setMermaidCode(result.mermaid_code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate diagram')
    } finally {
      setIsLoading(false)
    }
  }

  // Re-generate when type or file changes
  useEffect(() => {
    renderDiagram()
    
    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [diagramType])

  // Render mermaid when code changes
  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return
    renderMermaid(mermaidCode)
  }, [mermaidCode])

  const renderMermaid = async (code: string) => {
    if (!containerRef.current) return
    
    setIsLoading(true)
    
    // Clear previous content to prevent React conflicts
    containerRef.current.innerHTML = ''
    
    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#6366f1',
          primaryTextColor: '#e4e4e7',
          primaryBorderColor: '#27272a',
          lineColor: '#52525b',
          secondaryColor: '#18181b',
          tertiaryColor: '#0f0f11',
          background: '#09090b',
          mainBkg: '#18181b',
          nodeBorder: '#27272a',
          clusterBkg: '#18181b',
          titleColor: '#e4e4e7',
          edgeLabelBackground: '#18181b',
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
      <div className="p-4 border-b border-dv-border/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-dv-purple" />
            Diagrams
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={generateDiagram}
              className="p-1.5 rounded-lg hover:bg-dv-elevated transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 text-dv-text-muted', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg hover:bg-dv-elevated transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-dv-text-muted" />
            </button>
          </div>
        </div>

        {/* Diagram type selector */}
        <div className="flex gap-1 p-1 bg-dv-bg rounded-lg">
          {(Object.keys(DIAGRAM_LABELS) as DiagramType[]).map((type) => (
            <button
              key={type}
              onClick={() => setDiagramType(type)}
              className={clsx(
                'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors',
                diagramType === type
                  ? 'bg-dv-elevated text-dv-text'
                  : 'text-dv-text-muted hover:text-dv-text'
              )}
            >
              {DIAGRAM_LABELS[type]}
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
      <div className="p-3 border-t border-dv-border/30">
        <p className="text-[10px] text-dv-text-muted">
          AI-generated from code analysis · Mermaid.js
        </p>
      </div>
    </div>
  )
}

