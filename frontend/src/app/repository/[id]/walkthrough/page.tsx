'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { WalkthroughPlayer } from '@/components/walkthrough/WalkthroughPlayer'
import { FileExplorer } from '@/components/walkthrough/FileExplorer'
import { DiagramPanel } from '@/components/walkthrough/DiagramPanel'
import { SandboxPanel } from '@/components/walkthrough/SandboxPanel'
import { ImpactPanel } from '@/components/walkthrough/ImpactPanel'
import {
  ArrowLeft,
  Layers,
  FileCode,
  GitBranch,
  Terminal,
  Loader2,
  Sparkles,
  AlertCircle,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { files, walkthroughs, repositories, FileNode, WalkthroughScript, Repository } from '@/lib/api'
import toast from 'react-hot-toast'

type PanelType = 'files' | 'diagram' | 'sandbox' | 'impact'

/** Adapt API FileNode shape (is_directory) to component shape (isDirectory) */
function adaptFileTree(nodes: FileNode[]): any[] {
  return nodes.map((n) => ({
    id: n.id || n.path,
    path: n.path,
    name: n.name,
    isDirectory: n.is_directory,
    language: n.language ?? undefined,
    children: n.children ? adaptFileTree(n.children) : undefined,
  }))
}

export default function WalkthroughPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const fileFromQuery = searchParams.get('file')

  const [repo, setRepo] = useState<Repository | null>(null)
  const [fileTree, setFileTree] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<string>(fileFromQuery || '')
  const [codeContent, setCodeContent] = useState<string>('')
  const [script, setScript] = useState<WalkthroughScript | null>(null)
  const [activePanel, setActivePanel] = useState<PanelType>('files')
  const [isPlaying, setIsPlaying] = useState(false)

  // Loading states
  const [isLoadingTree, setIsLoadingTree] = useState(true)
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch repo & file tree on mount
  useEffect(() => {
    async function load() {
      setIsLoadingTree(true)
      try {
        const [repoData, tree] = await Promise.all([
          repositories.get(params.id),
          files.getTree(params.id),
        ])
        setRepo(repoData)
        setFileTree(adaptFileTree(tree))

        // Auto-select first non-directory file if none selected
        if (!fileFromQuery) {
          const first = findFirstFile(tree)
          if (first) setSelectedFile(first.path)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repository')
      } finally {
        setIsLoadingTree(false)
      }
    }
    load()
  }, [params.id, fileFromQuery])

  // Fetch code when selected file changes
  useEffect(() => {
    if (!selectedFile) return
    let cancelled = false

    async function loadCode() {
      setIsLoadingCode(true)
      setScript(null)
      try {
        const content = await files.getContent(params.id, selectedFile)
        if (!cancelled) setCodeContent(content)
      } catch {
        if (!cancelled) setCodeContent('// Failed to load file content')
      } finally {
        if (!cancelled) setIsLoadingCode(false)
      }
    }
    loadCode()
    return () => { cancelled = true }
  }, [selectedFile, params.id])

  const handleGenerate = useCallback(async () => {
    if (!selectedFile) return
    setIsGenerating(true)
    setIsPlaying(false)
    try {
      const result = await walkthroughs.generate(params.id, selectedFile, 'developer')
      // Adapt snake_case from API to camelCase for WalkthroughPlayer
      setScript({
        ...result,
        segments: result.segments.map((seg) => ({
          ...seg,
        })),
      })
      toast.success('Walkthrough generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate walkthrough')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedFile, params.id])

  // Map WalkthroughScript (snake_case) to the camelCase shape WalkthroughPlayer expects
  const playerScript = script
    ? {
        id: script.id,
        filePath: script.file_path,
        title: script.title,
        summary: script.summary,
        totalDuration: script.total_duration,
        segments: script.segments.map((s) => ({
          id: s.id,
          order: s.order,
          text: s.text,
          startLine: s.start_line,
          endLine: s.end_line,
          highlightLines: s.highlight_lines,
          durationEstimate: s.duration_estimate,
        })),
      }
    : null

  // Loading state
  if (isLoadingTree) {
    return (
      <div className="h-screen bg-dv-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-dv-accent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-dv-bg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-dv-error mx-auto mb-3" />
          <p className="text-sm text-dv-error mb-4">{error}</p>
          <Link href={`/repository/${params.id}`} className="btn-secondary">Back to Repository</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-dv-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-dv-border/30 bg-dv-bg/80 backdrop-blur-lg flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/repository/${params.id}`}
            className="p-1.5 rounded-lg hover:bg-dv-elevated transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-dv-text-muted" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-dv-accent/10 flex items-center justify-center">
              <GitBranch className="w-3.5 h-3.5 text-dv-accent" />
            </div>
            <div>
              <h1 className="text-sm font-medium">{repo?.name || 'Repository'}</h1>
              <p className="text-xs text-dv-text-muted truncate max-w-[200px]">{selectedFile || 'Select a file'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PanelButton
            active={activePanel === 'files'}
            onClick={() => setActivePanel('files')}
            icon={<FileCode className="w-3.5 h-3.5" />}
            label="Files"
          />
          <PanelButton
            active={activePanel === 'diagram'}
            onClick={() => setActivePanel('diagram')}
            icon={<Layers className="w-3.5 h-3.5" />}
            label="Diagram"
          />
          <PanelButton
            active={activePanel === 'sandbox'}
            onClick={() => setActivePanel('sandbox')}
            icon={<Terminal className="w-3.5 h-3.5" />}
            label="Sandbox"
          />
          <PanelButton
            active={activePanel === 'impact'}
            onClick={() => setActivePanel('impact')}
            icon={<Zap className="w-3.5 h-3.5" />}
            label="Impact"
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Impact takes the full page when active */}
        {activePanel === 'impact' ? (
          <div className="flex-1 overflow-hidden">
            <ImpactPanel repositoryId={params.id} filePath={selectedFile} />
          </div>
        ) : (
          <>
            {/* Side panel */}
            <motion.div
              className="w-72 border-r border-dv-border/30 bg-dv-surface overflow-hidden flex-shrink-0"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              {activePanel === 'files' && (
                <FileExplorer
                  files={fileTree}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
              )}
              {activePanel === 'diagram' && (
                <DiagramPanel repositoryId={params.id} filePath={selectedFile} />
              )}
              {activePanel === 'sandbox' && (
                <SandboxPanel />
              )}
            </motion.div>

            {/* Walkthrough player or generate prompt */}
            <div className="flex-1 overflow-hidden relative">
              {isLoadingCode ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-dv-accent animate-spin mr-3" />
                  <span className="text-sm text-dv-text-muted">Loading file…</span>
                </div>
              ) : !playerScript ? (
                /* No walkthrough yet — show generate prompt */
                <div className="h-full flex flex-col items-center justify-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-dv-accent/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-dv-accent" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">Generate a Walkthrough</h2>
                  <p className="text-sm text-dv-text-muted text-center max-w-md mb-6">
                    AI will analyze <span className="text-dv-text font-medium">{selectedFile.split('/').pop()}</span> and create
                    a narrated, step-by-step code walkthrough with voice.
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedFile}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Walkthrough
                      </>
                    )}
                  </button>
                  {codeContent && (
                    <p className="text-xs text-dv-text-muted mt-4">
                      {codeContent.split('\n').length} lines · {selectedFile.split('.').pop()?.toUpperCase()}
                    </p>
                  )}
                </div>
              ) : (
                <WalkthroughPlayer
                  code={codeContent}
                  script={playerScript}
                  filePath={selectedFile}
                  isPlaying={isPlaying}
                  onPlayingChange={setIsPlaying}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PanelButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm',
        active
          ? 'bg-dv-accent/10 text-dv-accent'
          : 'text-dv-text-muted hover:bg-dv-elevated hover:text-dv-text'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}

/** Walk the tree and return the first non-directory node */
function findFirstFile(nodes: FileNode[]): FileNode | null {
  for (const n of nodes) {
    if (!n.is_directory) return n
    if (n.children?.length) {
      const found = findFirstFile(n.children)
      if (found) return found
    }
  }
  return null
}

