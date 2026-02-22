'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  FileCode,
  GitBranch,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'
import { files, ImpactAnalysis, CodebaseImpact } from '@/lib/api'

type AnalysisMode = 'file' | 'codebase'

interface ImpactPanelProps {
  repositoryId: string
  filePath: string
}

export function ImpactPanel({ repositoryId, filePath }: ImpactPanelProps) {
  const [mode, setMode] = useState<AnalysisMode>('codebase')
  const [impact, setImpact] = useState<ImpactAnalysis | null>(null)
  const [codebaseImpact, setCodebaseImpact] = useState<CodebaseImpact | null>(null)
  const [symbol, setSymbol] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [graphStatus, setGraphStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle')
  const containerRef = useRef<HTMLDivElement>(null)
  const renderCountRef = useRef(0)

  /* =========== file-level analysis =========== */
  const runFileAnalysis = async (symbolOverride?: string) => {
    if (!filePath) return
    setIsLoading(true)
    setError(null)
    setGraphStatus('idle')
    try {
      const resolvedSymbol = (symbolOverride ?? symbol).trim()
      const result = await files.getImpact(
        repositoryId,
        filePath,
        resolvedSymbol ? resolvedSymbol : undefined
      )
      setImpact(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze impact')
      setImpact(null)
    } finally {
      setIsLoading(false)
    }
  }

  /* =========== codebase-level analysis =========== */
  const runCodebaseAnalysis = async () => {
    setIsLoading(true)
    setError(null)
    setGraphStatus('idle')
    try {
      const result = await files.getCodebaseImpact(repositoryId)
      setCodebaseImpact(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze codebase')
      setCodebaseImpact(null)
    } finally {
      setIsLoading(false)
    }
  }

  /* auto-run on mount / mode change */
  useEffect(() => {
    stopBrief()
    if (mode === 'codebase') {
      setImpact(null)
      runCodebaseAnalysis()
    } else {
      setCodebaseImpact(null)
      setSymbol('')
      runFileAnalysis('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryId, filePath, mode])

  /* mermaid render */
  const mermaidCode =
    mode === 'codebase' ? codebaseImpact?.impact_mermaid : impact?.impact_mermaid

  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return
    renderMermaid(mermaidCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mermaidCode])

  useEffect(() => {
    return () => stopBrief()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderMermaid = async (code: string) => {
    if (!containerRef.current) {
      // Container not in DOM yet — retry after a paint frame
      await new Promise((r) => requestAnimationFrame(r))
      if (!containerRef.current) return
    }
    containerRef.current.innerHTML = ''
    setGraphStatus('rendering')

    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
      })

      renderCountRef.current += 1
      const id = `impact-graph-${Date.now()}-${renderCountRef.current}`
      const { svg } = await mermaid.render(id, code)
      if (containerRef.current) {
        containerRef.current.innerHTML = svg
        // Make the SVG fill the container
        const svgEl = containerRef.current.querySelector('svg')
        if (svgEl) {
          svgEl.style.width = '100%'
          svgEl.style.minHeight = '380px'
          svgEl.style.height = 'auto'
          svgEl.removeAttribute('height')
        }
      }
      setGraphStatus('done')
    } catch (err) {
      console.error('Mermaid render failed:', err)
      setGraphStatus('error')
      if (containerRef.current) {
        containerRef.current.innerHTML =
          `<div class="flex flex-col items-center gap-2 py-8"><p class="text-sm text-red-400">Could not render impact graph</p><pre class="text-xs text-dv-text-muted bg-dv-surface p-3 rounded-lg max-w-xl overflow-auto max-h-40">${code}</pre></div>`
      }
    }
  }

  const currentBrief =
    mode === 'codebase' ? codebaseImpact?.brief_script : impact?.brief_script

  const stopBrief = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }

  const toggleBrief = () => {
    if (!currentBrief) return
    if (isSpeaking) {
      stopBrief()
      return
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(currentBrief)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }

  const riskOf = (level: string) =>
    level === 'high'
      ? 'bg-red-500/10 text-red-400 border-red-500/30'
      : level === 'medium'
      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      : 'bg-green-500/10 text-green-400 border-green-500/30'

  /* =========== RENDER =========== */
  return (
    <div className="h-full flex flex-col overflow-hidden bg-dv-surface">
      {/* ── Top toolbar ── */}
      <div className="px-6 py-3 border-b border-dv-border/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-dv-accent" />
          <h2 className="text-base font-semibold">Change Impact Simulator</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-dv-elevated p-0.5">
            <button
              onClick={() => setMode('codebase')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                mode === 'codebase'
                  ? 'bg-dv-accent/15 text-dv-accent'
                  : 'text-dv-text-muted hover:text-dv-text'
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Codebase
            </button>
            <button
              onClick={() => setMode('file')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                mode === 'file'
                  ? 'bg-dv-accent/15 text-dv-accent'
                  : 'text-dv-text-muted hover:text-dv-text'
              )}
            >
              <FileCode className="w-4 h-4" />
              Single File
            </button>
          </div>

          {/* Symbol input (file mode) */}
          {mode === 'file' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dv-text-muted" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runFileAnalysis()
                  }}
                  placeholder="Symbol (optional)"
                  className="w-48 pl-8 pr-3 py-1.5 text-sm bg-dv-elevated border border-dv-border/40 rounded-lg focus:outline-none focus:border-dv-accent/50 placeholder:text-dv-text-muted/60"
                />
              </div>
              <button
                onClick={() => runFileAnalysis()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Analyze
              </button>
            </div>
          )}

          {/* Refresh (codebase mode) */}
          {mode === 'codebase' && (
            <button
              onClick={runCodebaseAnalysis}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-dv-accent animate-spin mr-3" />
            <span className="text-sm text-dv-text-muted">
              Analyzing {mode === 'codebase' ? 'codebase' : 'file'} impact…
            </span>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="mx-6 mt-6 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ============ CODEBASE MODE ============ */}
        {mode === 'codebase' && codebaseImpact && !isLoading && (
          <div className="p-6 space-y-6">
            {/* ── Row 1: Risk + Stats ── */}
            <div className="flex items-center gap-6">
              <span
                className={clsx(
                  'px-4 py-2 text-sm font-bold rounded-full border',
                  riskOf(codebaseImpact.overall_risk_level)
                )}
              >
                {codebaseImpact.overall_risk_level.toUpperCase()} RISK
              </span>
              <span className="text-sm text-dv-text-muted">
                Score: <span className="font-semibold text-dv-text">{codebaseImpact.overall_risk_score}</span>/100
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-dv-elevated border border-dv-border/20">
                <p className="text-xs text-dv-text-muted uppercase tracking-wider mb-1">Source Files</p>
                <p className="text-2xl font-bold text-dv-text">{codebaseImpact.total_files}</p>
              </div>
              <div className="p-4 rounded-xl bg-dv-elevated border border-dv-border/20">
                <p className="text-xs text-dv-text-muted uppercase tracking-wider mb-1">Dependencies</p>
                <p className="text-2xl font-bold text-dv-text">{codebaseImpact.total_dependencies}</p>
              </div>
              <div className="p-4 rounded-xl bg-dv-elevated border border-dv-border/20">
                <p className="text-xs text-dv-text-muted uppercase tracking-wider mb-1">Components</p>
                <p className="text-2xl font-bold text-dv-text">{codebaseImpact.connected_components}</p>
              </div>
              <div className="p-4 rounded-xl bg-dv-elevated border border-dv-border/20">
                <p className="text-xs text-dv-text-muted uppercase tracking-wider mb-1">Is DAG</p>
                <p className="text-2xl font-bold text-dv-text">{codebaseImpact.is_dag ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* ── Row 2: Two-column — Brief + Recommended Actions ── */}
            <div className="grid grid-cols-2 gap-5">
              {/* Brief + audio */}
              <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-dv-text">Codebase Brief</h3>
                  <button
                    onClick={toggleBrief}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors"
                  >
                    {isSpeaking ? (
                      <><Pause className="w-3.5 h-3.5" /> Stop</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> Listen</>
                    )}
                  </button>
                </div>
                <p className="text-sm text-dv-text-muted leading-relaxed">
                  {codebaseImpact.brief_script}
                </p>
              </div>

              {/* Recommended actions */}
              <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                <h3 className="text-sm font-semibold text-dv-text mb-3">Recommended Actions</h3>
                <ol className="space-y-2">
                  {codebaseImpact.recommended_actions.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-dv-text-muted">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-dv-accent/10 text-dv-accent text-xs flex items-center justify-center font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* ── Row 4: Two-column — Hotspots + Most Imported ── */}
            <div className="grid grid-cols-2 gap-5">
              {/* Hotspot files */}
              {codebaseImpact.hotspots.length > 0 && (
                <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                  <h3 className="text-sm font-semibold text-dv-text mb-3">
                    Hotspot Files ({codebaseImpact.hotspots.length})
                  </h3>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {codebaseImpact.hotspots.map((hs) => (
                      <div
                        key={hs.file}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dv-surface/50 transition-colors"
                      >
                        <span className="text-xs text-dv-text-muted font-mono truncate flex-1 mr-3">
                          {hs.file}
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-dv-text-muted">
                            {hs.direct_dependents}d / {hs.total_affected}a
                          </span>
                          <span
                            className={clsx(
                              'px-2 py-0.5 text-xs font-semibold rounded border',
                              riskOf(hs.risk_level)
                            )}
                          >
                            {hs.risk_score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Most imported */}
              {codebaseImpact.most_imported.length > 0 && (
                <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                  <h3 className="text-sm font-semibold text-dv-text mb-3">Most Imported Files</h3>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {codebaseImpact.most_imported.map((m) => (
                      <div
                        key={m.file}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dv-surface/50 transition-colors text-xs"
                      >
                        <span className="text-dv-text-muted font-mono truncate flex-1 mr-3">
                          {m.file}
                        </span>
                        <span className="text-dv-accent font-semibold whitespace-nowrap">{m.import_count} imports</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Circular deps */}
            {codebaseImpact.circular_dependencies.length > 0 && (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-5">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Circular Dependencies ({codebaseImpact.circular_dependencies.length})
                </h3>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {codebaseImpact.circular_dependencies.map((cycle, i) => (
                    <li key={i} className="text-xs text-yellow-300/80 font-mono">
                      {cycle.join(' \u2192 ')} \u2192 {cycle[0]}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Graph (at bottom) ── */}
            <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
              <h3 className="text-sm font-semibold text-dv-text mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-dv-accent" />
                Codebase Impact Graph
              </h3>
              {graphStatus === 'rendering' && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-dv-accent animate-spin mr-2" />
                  <span className="text-sm text-dv-text-muted">Rendering graph…</span>
                </div>
              )}
              <div
                ref={containerRef}
                className="w-full min-h-[420px] overflow-auto [&_svg]:w-full [&_svg]:min-h-[400px] [&_svg]:h-auto"
              />
            </div>
          </div>
        )}

        {/* ============ FILE MODE ============ */}
        {mode === 'file' && impact && !isLoading && (
          <div className="p-6 space-y-6">
            {/* ── Risk + symbol ── */}
            <div className="flex items-center gap-6">
              <span
                className={clsx(
                  'px-4 py-2 text-sm font-bold rounded-full border',
                  riskOf(impact.risk_level)
                )}
              >
                {impact.risk_level.toUpperCase()} RISK
              </span>
              <span className="text-sm text-dv-text-muted">
                Score: <span className="font-semibold text-dv-text">{impact.risk_score}</span>/100
              </span>
              {impact.symbol_context && (
                <span className="text-sm text-dv-text-muted ml-auto">
                  {impact.symbol_context.type}: <span className="font-medium text-dv-text">{impact.symbol_context.name}</span>
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-dv-elevated border border-dv-border/20">
                <p className="text-xs text-dv-text-muted uppercase tracking-wider mb-1">Direct Dependents</p>
                <p className="text-2xl font-bold text-dv-text">{impact.direct_dependents.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-dv-elevated border border-dv-border/20">
                <p className="text-xs text-dv-text-muted uppercase tracking-wider mb-1">Total Affected</p>
                <p className="text-2xl font-bold text-dv-text">{impact.total_affected}</p>
              </div>
            </div>

            {/* ── Two-column: Brief + Refactor Steps ── */}
            <div className="grid grid-cols-2 gap-5">
              {/* Brief + audio */}
              <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-dv-text">Impact Brief</h3>
                  <button
                    onClick={toggleBrief}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors"
                  >
                    {isSpeaking ? (
                      <><Pause className="w-3.5 h-3.5" /> Stop</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> Listen</>
                    )}
                  </button>
                </div>
                <p className="text-sm text-dv-text-muted leading-relaxed">
                  {impact.brief_script}
                </p>
              </div>

              {/* Refactor steps */}
              <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                <h3 className="text-sm font-semibold text-dv-text mb-3">Recommended Refactor Steps</h3>
                <ol className="space-y-2">
                  {impact.recommended_refactor_steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-dv-text-muted">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-dv-accent/10 text-dv-accent text-xs flex items-center justify-center font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Circular dependencies warning */}
            {impact.circular_dependencies.length > 0 && (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-5">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Circular Dependencies Detected
                </h3>
                <ul className="space-y-1.5">
                  {impact.circular_dependencies.map((cycle, i) => (
                    <li key={i} className="text-xs text-yellow-300/80 font-mono">
                      {cycle.join(' \u2192 ')} \u2192 {cycle[0]}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Two-column: Dependents + Affected files ── */}
            <div className="grid grid-cols-2 gap-5">
              {/* Direct dependents */}
              {impact.direct_dependents.length > 0 && (
                <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                  <h3 className="text-sm font-semibold text-dv-text mb-3">
                    Direct Dependents ({impact.direct_dependents.length})
                  </h3>
                  <ul className="space-y-1.5 max-h-60 overflow-y-auto">
                    {impact.direct_dependents.map((dep) => (
                      <li
                        key={dep}
                        className="text-xs text-dv-text-muted font-mono truncate py-1 px-2 rounded hover:bg-dv-surface/50"
                      >
                        {dep}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Affected files */}
              {impact.affected_files.length > 0 && (
                <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
                  <h3 className="text-sm font-semibold text-dv-text mb-3">
                    All Affected Files ({impact.affected_files.length})
                  </h3>
                  <ul className="space-y-1.5 max-h-60 overflow-y-auto">
                    {impact.affected_files.map((f) => (
                      <li
                        key={f}
                        className="text-xs text-dv-text-muted font-mono truncate py-1 px-2 rounded hover:bg-dv-surface/50"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Graph (at bottom) ── */}
            <div className="rounded-xl bg-dv-elevated border border-dv-border/20 p-5">
              <h3 className="text-sm font-semibold text-dv-text mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-dv-accent" />
                Impact Graph
              </h3>
              {graphStatus === 'rendering' && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-dv-accent animate-spin mr-2" />
                  <span className="text-sm text-dv-text-muted">Rendering graph…</span>
                </div>
              )}
              <div
                ref={containerRef}
                className="w-full min-h-[420px] overflow-auto [&_svg]:w-full [&_svg]:min-h-[400px] [&_svg]:h-auto"
              />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error
          && ((mode === 'file' && !impact) || (mode === 'codebase' && !codebaseImpact)) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Zap className="w-12 h-12 text-dv-text-muted/40 mb-3" />
            <p className="text-sm text-dv-text-muted">
              {mode === 'codebase'
                ? 'Analyze the entire codebase for impact hotspots'
                : 'Select a file to analyze its change impact'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
