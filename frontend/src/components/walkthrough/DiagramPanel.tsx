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
    generateDiagram()
  }, [diagramType, filePath])

  // Render mermaid when code changes
  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return
    renderMermaid(mermaidCode)
  }, [mermaidCode])

  const renderMermaid = async (code: string) => {
    if (!containerRef.current) return
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
      const { svg } = await mermaid.render('diagram-' + Date.now(), code)
      containerRef.current.innerHTML = svg
    } catch {
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p class="text-xs text-dv-text-muted text-center py-8">Could not render diagram</p>`
      }
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
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="w-5 h-5 text-dv-accent animate-spin" />
            <span className="text-xs text-dv-text-muted">Generating diagram…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <AlertCircle className="w-5 h-5 text-dv-error" />
            <p className="text-xs text-dv-text-muted">{error}</p>
            <button onClick={generateDiagram} className="text-xs text-dv-accent hover:underline mt-1">
              Retry
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="min-h-[200px] flex items-center justify-center [&_svg]:max-w-full"
          />
        )}
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

