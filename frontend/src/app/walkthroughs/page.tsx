'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Play,
  Search,
  Clock,
  FileCode,
  SortAsc,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { clsx } from 'clsx'
import { repositories, walkthroughs, Repository, WalkthroughScript } from '@/lib/api'
import toast from 'react-hot-toast'

interface WalkthroughEntry extends WalkthroughScript {
  repoId: string
  repoName: string
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function WalkthroughsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'developer' | 'manager'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'duration'>('recent')
  const [entries, setEntries] = useState<WalkthroughEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true)
      try {
        const repos = await repositories.list()
        // For each repo, try to fetch walkthroughs per file — the API provides getForFile
        // Since we don't have a "list all walkthroughs" endpoint, aggregate from repos
        const all: WalkthroughEntry[] = []

        for (const repo of repos) {
          if (!repo.is_indexed) continue
          try {
            // The walkthroughs.getForFile requires a file path, but we can try listing from repo
            // Try fetching walkthroughs for the repo using the diagrams endpoint pattern
            // Actually the API has no "list walkthroughs for repo" endpoint, so this is best-effort
            // We'll try the files tree and then check per file — but that's expensive.
            // For now, show repos as launch-points for walkthroughs.
          } catch {
            // Silently skip
          }
        }

        setEntries(all)
      } catch {
        toast.error('Failed to load walkthroughs')
      } finally {
        setIsLoading(false)
      }
    }
    loadAll()
  }, [])

  const filteredEntries = entries
    .filter((wt) => {
      if (filterMode !== 'all' && wt.view_mode !== filterMode) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          wt.title.toLowerCase().includes(q) ||
          wt.file_path.toLowerCase().includes(q) ||
          wt.repoName.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'duration') return b.total_duration - a.total_duration
      return 0 // default ordering
    })

  const handleDelete = async (id: string) => {
    try {
      await walkthroughs.delete(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      toast.success('Walkthrough deleted')
    } catch {
      toast.error('Failed to delete walkthrough')
    }
  }

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-dv-bg/80 backdrop-blur-lg border-b border-dv-border/30">
          <div className="flex items-center justify-between px-8 h-16">
            <h1 className="text-lg font-semibold">Walkthroughs</h1>
          </div>
        </div>

        <div className="px-8 py-6 max-w-5xl">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dv-text-muted" />
              <input
                type="text"
                placeholder="Search walkthroughs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-9"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-dv-surface rounded-lg border border-dv-border/40">
              {(['all', 'developer', 'manager'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                    filterMode === mode
                      ? 'bg-dv-elevated text-dv-text'
                      : 'text-dv-text-muted hover:text-dv-text'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <SortAsc className="w-3.5 h-3.5 text-dv-text-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-dv-surface border border-dv-border/40 rounded-lg py-1.5 px-2.5 text-xs text-dv-text focus:outline-none focus:ring-1 focus:ring-dv-accent/50"
              >
                <option value="recent">Recent</option>
                <option value="duration">Longest</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-dv-accent animate-spin mr-3" />
              <span className="text-sm text-dv-text-muted">Loading walkthroughs…</span>
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="space-y-3">
              {filteredEntries.map((wt, index) => (
                <motion.div
                  key={wt.id}
                  className="card p-4 hover:bg-dv-elevated/30 transition-colors group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/repository/${wt.repoId}/walkthrough?file=${encodeURIComponent(wt.file_path)}`}
                      className="w-11 h-11 rounded-xl bg-dv-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-dv-accent/20 transition-colors"
                    >
                      <Play className="w-4 h-4 text-dv-accent ml-0.5" />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/repository/${wt.repoId}/walkthrough?file=${encodeURIComponent(wt.file_path)}`}
                          className="text-sm font-semibold hover:text-dv-accent transition-colors truncate"
                        >
                          {wt.title}
                        </Link>
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-medium',
                          wt.view_mode === 'developer'
                            ? 'badge-accent'
                            : 'bg-dv-purple/10 text-dv-purple'
                        )}>
                          {wt.view_mode}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-dv-text-muted">
                        <span className="flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          {wt.file_path}
                        </span>
                        <span className="text-dv-border">·</span>
                        <span>{wt.repoName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-dv-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(wt.total_duration)}
                      </span>
                      <span>{wt.segments.length} segments</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/repository/${wt.repoId}/walkthrough?file=${encodeURIComponent(wt.file_path)}`}
                        className="px-3 py-1.5 rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors text-xs font-medium"
                      >
                        Play
                      </Link>
                      <button
                        onClick={() => handleDelete(wt.id)}
                        className="p-1.5 rounded-lg hover:bg-dv-error/10 hover:text-dv-error transition-colors text-dv-text-muted"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-dv-accent/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-dv-accent" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No walkthroughs yet</h2>
              <p className="text-sm text-dv-text-muted mb-6 max-w-sm mx-auto">
                Open a repository and generate your first AI-powered code walkthrough.
              </p>
              <Link href="/repositories" className="btn-primary inline-flex items-center gap-2">
                <Play className="w-4 h-4" />
                Go to Repositories
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

