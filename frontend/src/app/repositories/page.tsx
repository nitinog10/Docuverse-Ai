'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  FolderGit2,
  Plus,
  Search,
  Grid,
  List,
  CheckCircle2,
  Loader2,
  Clock,
  Trash2,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { ConnectRepoModal } from '@/components/dashboard/ConnectRepoModal'
import { repositories, Repository } from '@/lib/api'
import { clsx } from 'clsx'
import { formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const languageColors: Record<string, string> = {
  Python: 'bg-blue-500',
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-yellow-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-orange-500',
  Java: 'bg-red-500',
}

type ViewMode = 'grid' | 'list'
type FilterMode = 'all' | 'indexed' | 'pending'

export default function RepositoriesPage() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [repos, setRepos] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [indexingId, setIndexingId] = useState<string | null>(null)

  const fetchRepos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await repositories.list()
      setRepos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchRepos() }, [fetchRepos])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await repositories.delete(id)
      setRepos((prev) => prev.filter((r) => r.id !== id))
      toast.success('Repository removed')
    } catch (err) {
      toast.error('Failed to remove repository')
    } finally {
      setDeletingId(null)
    }
  }

  const handleIndex = async (id: string) => {
    setIndexingId(id)
    try {
      await repositories.index(id)
      setRepos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_indexed: true, indexed_at: new Date().toISOString() } : r))
      )
      toast.success('Indexing started')
    } catch (err) {
      toast.error('Failed to index repository')
    } finally {
      setIndexingId(null)
    }
  }

  const filteredRepos = repos.filter((repo) => {
    if (filterMode === 'indexed' && !repo.is_indexed) return false
    if (filterMode === 'pending' && repo.is_indexed) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        repo.name.toLowerCase().includes(q) ||
        repo.full_name.toLowerCase().includes(q) ||
        repo.description?.toLowerCase().includes(q) ||
        repo.language?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-dv-bg/80 backdrop-blur-lg border-b border-dv-border/30">
          <div className="flex items-center justify-between px-8 h-16">
            <h1 className="text-lg font-semibold">Repositories</h1>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Connect
            </button>
          </div>
        </div>

        <div className="px-8 py-6 max-w-6xl">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dv-text-muted" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            <div className="flex items-center gap-0.5 p-0.5 bg-dv-surface rounded-lg border border-dv-border/50">
              {(['all', 'indexed', 'pending'] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                    filterMode === mode
                      ? 'bg-dv-accent/10 text-dv-accent'
                      : 'text-dv-text-muted hover:text-dv-text'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 p-0.5 bg-dv-surface rounded-lg border border-dv-border/50">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-dv-accent/10 text-dv-accent' : 'text-dv-text-muted'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-dv-accent/10 text-dv-accent' : 'text-dv-text-muted'
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs text-dv-text-muted ml-auto">
              {filteredRepos.length} repositor{filteredRepos.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="card flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-dv-accent animate-spin mr-3" />
              <span className="text-sm text-dv-text-muted">Loading repositories…</span>
            </div>
          ) : error ? (
            <div className="card text-center py-12">
              <AlertCircle className="w-8 h-8 text-dv-error mx-auto mb-3" />
              <p className="text-sm text-dv-error mb-4">{error}</p>
              <button onClick={fetchRepos} className="btn-secondary inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="card text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-dv-elevated flex items-center justify-center mx-auto mb-4">
                <FolderGit2 className="w-6 h-6 text-dv-text-muted" />
              </div>
              <h3 className="font-semibold mb-2">
                {repos.length === 0 ? 'No repositories connected' : 'No matches'}
              </h3>
              <p className="text-sm text-dv-text-muted mb-6">
                {repos.length === 0
                  ? 'Connect a GitHub repository to get started.'
                  : `No repos match "${searchQuery}"`}
              </p>
              {repos.length === 0 && (
                <button onClick={() => setIsConnectModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Connect Repository
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'list' ? (
                <motion.div
                  key="list"
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredRepos.map((repo, i) => (
                    <motion.div
                      key={repo.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="card-hover flex items-center gap-4 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/15 transition-colors flex-shrink-0">
                        <FolderGit2 className="w-5 h-5 text-dv-accent" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/repository/${repo.id}`} className="font-medium text-sm hover:text-dv-accent transition-colors truncate">
                            {repo.full_name}
                          </Link>
                          {repo.is_indexed ? (
                            <span className="badge-success flex-shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Indexed</span>
                          ) : (
                            <span className="badge-warning flex-shrink-0">Pending</span>
                          )}
                        </div>
                        <p className="text-xs text-dv-text-muted truncate">{repo.description || 'No description'}</p>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        {repo.language && (
                          <span className="flex items-center gap-1.5 text-xs text-dv-text-muted">
                            <span className={`w-2 h-2 rounded-full ${languageColors[repo.language] || 'bg-zinc-400'}`} />
                            {repo.language}
                          </span>
                        )}
                        {repo.indexed_at && (
                          <span className="text-xs text-dv-text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(repo.indexed_at)}
                          </span>
                        )}

                        {!repo.is_indexed && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleIndex(repo.id) }}
                            disabled={indexingId === repo.id}
                            className="btn-ghost text-xs flex items-center gap-1"
                          >
                            {indexingId === repo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Index
                          </button>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(repo.id) }}
                          disabled={deletingId === repo.id}
                          className="p-1.5 rounded-lg text-dv-text-muted hover:text-dv-error hover:bg-dv-error/10 transition-colors"
                        >
                          {deletingId === repo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>

                        <Link href={`/repository/${repo.id}`}>
                          <ArrowRight className="w-4 h-4 text-dv-text-muted group-hover:text-dv-accent group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredRepos.map((repo, i) => (
                    <motion.div
                      key={repo.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link href={`/repository/${repo.id}`} className="card-hover block group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/15 transition-colors">
                            <FolderGit2 className="w-5 h-5 text-dv-accent" />
                          </div>
                          {repo.is_indexed ? (
                            <CheckCircle2 className="w-4 h-4 text-dv-success" />
                          ) : (
                            <span className="badge-warning text-[10px]">Pending</span>
                          )}
                        </div>
                        <h3 className="font-medium text-sm mb-1 truncate group-hover:text-dv-accent transition-colors">{repo.name}</h3>
                        <p className="text-xs text-dv-text-muted line-clamp-2 mb-3">{repo.description || 'No description'}</p>
                        <div className="flex items-center justify-between text-xs text-dv-text-muted">
                          {repo.language ? (
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${languageColors[repo.language] || 'bg-zinc-400'}`} />
                              {repo.language}
                            </span>
                          ) : <span />}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:text-dv-accent transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      <ConnectRepoModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={fetchRepos}
      />
    </div>
  )
}

