'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  FileText,
  FolderTree,
  Package,
  Layers,
  Loader2,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { documentation } from '@/lib/api'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface DocSection {
  title: string
  content: string
}

interface FileDocumentation {
  path: string
  language: string
  summary: string
  sections: DocSection[]
}

interface RepositoryDocumentation {
  overview: string
  architecture: string
  folder_tree: string
  files: FileDocumentation[]
  dependencies: string
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function DocumentationPanel({ repoId }: { repoId: string }) {
  const [docs, setDocs] = useState<RepositoryDocumentation | null>(null)
  const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'files' | 'dependencies' | 'tree'>('overview')
  const [selectedFile, setSelectedFile] = useState<FileDocumentation | null>(null)
  const [fileSearch, setFileSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ── Fetch docs ──────────────────────────────
  const fetchDocs = useCallback(async () => {
    try {
      const res = await documentation.get(repoId)
      if (res.status === 'generating') {
        setStatus('generating')
      } else if (res.status === 'ready' && res.data) {
        setDocs(res.data)
        setStatus('ready')
      } else {
        // 'not_generated' or unknown → stop polling
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    }
  }, [repoId])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  // Poll while generating
  useEffect(() => {
    if (status !== 'generating') return
    const id = setInterval(fetchDocs, 4000)
    return () => clearInterval(id)
  }, [status, fetchDocs])

  // ── Generate ────────────────────────────────
  const handleGenerate = async () => {
    setStatus('generating')
    setError(null)
    try {
      await documentation.generate(repoId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setStatus('error')
    }
  }

  // ── Export markdown ─────────────────────────
  const handleExport = () => {
    if (!docs) return
    let md = `# Repository Documentation\n\n`
    md += `## Overview\n\n${docs.overview}\n\n`
    md += `## Architecture\n\n${docs.architecture}\n\n`
    md += `## Folder Structure\n\n\`\`\`\n${docs.folder_tree}\n\`\`\`\n\n`
    md += `## Dependencies\n\n${docs.dependencies}\n\n`
    md += `## File Documentation\n\n`
    for (const f of docs.files) {
      md += `### ${f.path}\n\n`
      for (const s of f.sections) {
        md += `#### ${s.title}\n\n${s.content}\n\n`
      }
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'documentation.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Filtered files ──────────────────────────
  const filteredFiles = docs?.files.filter((f) =>
    f.path.toLowerCase().includes(fileSearch.toLowerCase())
  ) ?? []

  // ── Idle / error / generating states ────────
  if (status === 'idle' || status === 'error') {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="w-10 h-10 text-dv-accent/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Generate Documentation</h3>
        <p className="text-sm text-dv-text-muted mb-6 max-w-md">
          Produce structured, MNC-standard documentation for every file and folder in this
          repository using AI-powered analysis.
        </p>
        {error && (
          <div className="flex items-center gap-2 text-xs text-dv-error mb-4">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        )}
        <button onClick={handleGenerate} className="btn-primary flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Generate Documentation
        </button>
      </div>
    )
  }

  if (status === 'generating') {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="w-8 h-8 text-dv-accent animate-spin mb-4" />
        <h3 className="text-lg font-semibold mb-2">Generating Documentation…</h3>
        <p className="text-sm text-dv-text-muted max-w-md">
          AI is analyzing every file in your repository. This may take a minute or two.
        </p>
      </div>
    )
  }

  if (!docs) return null

  // ── Ready state with tabs ──────────────────
  const tabs = [
    { key: 'overview', label: 'Overview', icon: BookOpen },
    { key: 'architecture', label: 'Architecture', icon: Layers },
    { key: 'files', label: 'Files', icon: FileText },
    { key: 'dependencies', label: 'Dependencies', icon: Package },
    { key: 'tree', label: 'Folder Tree', icon: FolderTree },
  ] as const

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-dv-surface rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSelectedFile(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-dv-accent text-white'
                  : 'text-dv-text-muted hover:text-dv-text hover:bg-dv-elevated/60'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={handleGenerate}
          className="btn-secondary flex items-center gap-2 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
        </button>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center gap-2 text-xs"
        >
          <Download className="w-3.5 h-3.5" /> Export .md
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (selectedFile?.path ?? '')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="card prose-invert max-w-none">
              <MarkdownBlock content={docs.overview} />
            </div>
          )}

          {/* ── Architecture ── */}
          {activeTab === 'architecture' && (
            <div className="card prose-invert max-w-none">
              <MarkdownBlock content={docs.architecture} />
            </div>
          )}

          {/* ── Folder Tree ── */}
          {activeTab === 'tree' && (
            <div className="card">
              <pre className="text-xs text-dv-text-secondary font-mono whitespace-pre overflow-x-auto leading-relaxed">
                {docs.folder_tree}
              </pre>
            </div>
          )}

          {/* ── Dependencies ── */}
          {activeTab === 'dependencies' && (
            <div className="card prose-invert max-w-none">
              <MarkdownBlock content={docs.dependencies} />
            </div>
          )}

          {/* ── Files ── */}
          {activeTab === 'files' && (
            <div className="grid lg:grid-cols-3 gap-4">
              {/* File sidebar */}
              <div className="lg:col-span-1 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dv-text-muted" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search files…"
                    className="input-field pl-9 text-xs"
                  />
                </div>
                <div className="card p-0 divide-y divide-dv-border/20 max-h-[60vh] overflow-y-auto">
                  {filteredFiles.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => setSelectedFile(f)}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center gap-2 ${
                        selectedFile?.path === f.path
                          ? 'bg-dv-accent/10 text-dv-accent'
                          : 'hover:bg-dv-elevated/50 text-dv-text-secondary'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{f.path}</span>
                      {f.language && f.language !== 'unknown' && (
                        <span className="ml-auto text-[10px] text-dv-text-muted bg-dv-elevated px-1.5 py-0.5 rounded">
                          {f.language}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredFiles.length === 0 && (
                    <p className="text-xs text-dv-text-muted text-center py-6">No files match.</p>
                  )}
                </div>
              </div>

              {/* File detail */}
              <div className="lg:col-span-2">
                {selectedFile ? (
                  <div className="card space-y-4">
                    <div className="flex items-center gap-2 border-b border-dv-border/20 pb-3">
                      <FileText className="w-4 h-4 text-dv-accent" />
                      <span className="text-sm font-semibold">{selectedFile.path}</span>
                      {selectedFile.language && (
                        <span className="badge-success text-[10px]">{selectedFile.language}</span>
                      )}
                    </div>
                    {selectedFile.sections.map((s, i) => (
                      <CollapsibleSection key={i} title={s.title} content={s.content} defaultOpen={i === 0} />
                    ))}
                  </div>
                ) : (
                  <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="w-8 h-8 text-dv-text-muted/40 mb-3" />
                    <p className="text-sm text-dv-text-muted">Select a file to view its documentation</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function CollapsibleSection({ title, content, defaultOpen = false }: { title: string; content: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-dv-text-secondary hover:text-dv-text transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pl-5 prose-invert max-w-none">
              <MarkdownBlock content={content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Simple markdown renderer (no external dependency).
 * Handles headings, bold, inline code, code blocks, lists, and tables.
 */
function MarkdownBlock({ content }: { content: string }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <pre key={elements.length} className="bg-dv-bg/60 rounded-lg p-3 my-2 overflow-x-auto text-xs">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Table (starts with |)
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      elements.push(<MarkdownTable key={elements.length} lines={tableLines} />)
      continue
    }

    // Heading
    if (line.startsWith('### ')) {
      elements.push(<h4 key={elements.length} className="text-sm font-semibold mt-4 mb-1">{renderInline(line.slice(4))}</h4>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={elements.length} className="text-base font-semibold mt-4 mb-1">{renderInline(line.slice(3))}</h3>)
      i++; continue
    }

    // List
    if (/^[-*]\s/.test(line.trim())) {
      const listItems: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s/, ''))
        i++
      }
      elements.push(
        <ul key={elements.length} className="list-disc list-inside space-y-0.5 my-1 text-sm text-dv-text-secondary">
          {listItems.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }

    // Empty line
    if (!line.trim()) { i++; continue }

    // Paragraph
    elements.push(<p key={elements.length} className="text-sm text-dv-text-secondary leading-relaxed my-1">{renderInline(line)}</p>)
    i++
  }

  return <>{elements}</>
}

/** Render inline markdown: bold, inline-code */
function renderInline(text: string): React.ReactNode {
  // Split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-dv-text font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-dv-elevated px-1 py-0.5 rounded text-xs text-dv-accent">{part.slice(1, -1)}</code>
    return <span key={i}>{part}</span>
  })
}

/** Render a markdown table from raw lines */
function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null
  const parseRow = (line: string) =>
    line.split('|').filter(Boolean).map((c) => c.trim())

  const header = parseRow(lines[0])
  // skip separator line (index 1)
  const rows = lines.slice(2).map(parseRow)

  return (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-dv-border/30">
            {header.map((h, i) => (
              <th key={i} className="text-left py-1.5 px-2 font-semibold text-dv-text-secondary">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-dv-border/10">
              {row.map((cell, ci) => (
                <td key={ci} className="py-1.5 px-2 text-dv-text-muted">{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
