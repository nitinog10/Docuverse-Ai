'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FolderGit2,
  Plus,
  Search,
  Play,
  FileCode,
  GitBranch,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { RepositoryCard } from '@/components/dashboard/RepositoryCard'
import { ConnectRepoModal } from '@/components/dashboard/ConnectRepoModal'
import { repositories, Repository } from '@/lib/api'
import { useUserStore } from '@/lib/store'

export default function DashboardPage() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [connectedRepos, setConnectedRepos] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useUserStore()

  const fetchConnectedRepos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const repos = await repositories.list()
      setConnectedRepos(repos)
    } catch (err) {
      console.error('Failed to fetch connected repositories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchConnectedRepos()
  }, [fetchConnectedRepos])

  const filteredRepos = connectedRepos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const indexedCount = connectedRepos.filter((r) => r.is_indexed).length

  if (!mounted) {
    return (
      <div className="min-h-screen bg-dv-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-dv-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-dv-bg/80 backdrop-blur-lg border-b border-dv-border/30">
          <div className="flex items-center justify-between px-8 h-16">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Connect Repo
            </button>
          </div>
        </div>

        <div className="px-8 py-6 max-w-6xl">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-display-sm mb-1">
              Welcome{user?.username ? `, ${user.username}` : ''}
            </h2>
            <p className="text-dv-text-secondary">
              {connectedRepos.length === 0
                ? 'Connect a repository to get started with AI walkthroughs.'
                : `You have ${connectedRepos.length} repositor${connectedRepos.length === 1 ? 'y' : 'ies'} connected.`}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Repositories" value={connectedRepos.length} icon={<FolderGit2 className="w-4 h-4" />} />
            <StatCard label="Indexed" value={indexedCount} icon={<FileCode className="w-4 h-4" />} />
            <StatCard label="Pending" value={connectedRepos.length - indexedCount} icon={<Sparkles className="w-4 h-4" />} className="hidden lg:flex" />
          </div>

          {/* Search */}
          {connectedRepos.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dv-text-muted" />
              <input
                type="text"
                placeholder="Search repositories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          )}

          {/* Repository list */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-dv-text-secondary uppercase tracking-wider">
                Your Repositories
              </h3>
              {connectedRepos.length > 0 && (
                <Link href="/repositories" className="text-xs text-dv-accent hover:text-dv-accent-hover flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="card flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-dv-accent animate-spin mr-3" />
                <span className="text-sm text-dv-text-muted">Loading repositories…</span>
              </div>
            ) : error ? (
              <div className="card text-center py-10">
                <AlertCircle className="w-8 h-8 text-dv-error mx-auto mb-3" />
                <p className="text-sm text-dv-error mb-4">{error}</p>
                <button onClick={fetchConnectedRepos} className="btn-secondary inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : connectedRepos.length === 0 ? (
              <EmptyState onConnect={() => setIsConnectModalOpen(true)} />
            ) : filteredRepos.length === 0 ? (
              <div className="card text-center py-10">
                <Search className="w-6 h-6 text-dv-text-muted mx-auto mb-2" />
                <p className="text-sm text-dv-text-muted">No repositories match &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRepos.map((repo) => (
                  <RepositoryCard
                    key={repo.id}
                    repository={{
                      id: repo.id,
                      name: repo.name,
                      fullName: repo.full_name,
                      description: repo.description || undefined,
                      language: repo.language || undefined,
                      isIndexed: repo.is_indexed,
                      indexedAt: repo.indexed_at,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConnectRepoModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={fetchConnectedRepos}
      />
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({
  label,
  value,
  icon,
  className = '',
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  className?: string
}) {
  return (
    <div className={`card flex items-center gap-4 ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-dv-accent/10 flex items-center justify-center text-dv-accent">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-dv-text-muted">{label}</p>
      </div>
    </div>
  )
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="card text-center py-14">
      <div className="w-14 h-14 rounded-2xl bg-dv-accent/10 flex items-center justify-center mx-auto mb-4">
        <GitBranch className="w-6 h-6 text-dv-accent" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No repositories yet</h3>
      <p className="text-sm text-dv-text-muted mb-6 max-w-xs mx-auto">
        Connect a GitHub repository to generate AI-powered code walkthroughs.
      </p>
      <button onClick={onConnect} className="btn-primary inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Connect Repository
      </button>
    </div>
  )
}

