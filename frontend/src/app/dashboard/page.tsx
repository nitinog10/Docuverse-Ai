'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  FolderGit2, 
  Plus, 
  Search, 
  Settings,
  Play,
  Clock,
  FileCode,
  GitBranch,
  Star,
  MoreVertical,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { RepositoryCard } from '@/components/dashboard/RepositoryCard'
import { ConnectRepoModal } from '@/components/dashboard/ConnectRepoModal'
import { repositories, Repository } from '@/lib/api'

const recentWalkthroughs = [
  {
    id: 'wt_1',
    fileName: 'auth_flow.py',
    repoName: 'docuverse-core',
    duration: '4:32',
    viewedAt: '2 hours ago',
  },
  {
    id: 'wt_2',
    fileName: 'UserDashboard.tsx',
    repoName: 'frontend-app',
    duration: '3:15',
    viewedAt: '5 hours ago',
  },
  {
    id: 'wt_3',
    fileName: 'database.py',
    repoName: 'docuverse-core',
    duration: '6:48',
    viewedAt: '1 day ago',
  },
]

export default function DashboardPage() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [connectedRepos, setConnectedRepos] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const filteredRepos = connectedRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-dv-bg flex items-center justify-center">
        <div className="animate-pulse text-dv-text-muted">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-dv-text-muted">Manage your repositories and walkthroughs</p>
          </div>
          
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Connect Repository
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dv-text-muted" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dv-surface border border-dv-border rounded-xl py-3 pl-12 pr-4
                     text-dv-text placeholder:text-dv-text-muted
                     focus:outline-none focus:ring-2 focus:ring-dv-accent/50 focus:border-dv-accent
                     transition-all"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Connected Repos"
            value={connectedRepos.length}
            icon={<FolderGit2 className="w-5 h-5" />}
            color="accent"
          />
          <StatCard
            label="Indexed Files"
            value={247}
            icon={<FileCode className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Walkthroughs"
            value={38}
            icon={<Play className="w-5 h-5" />}
            color="success"
          />
          <StatCard
            label="Total Duration"
            value="2h 34m"
            icon={<Clock className="w-5 h-5" />}
            color="warning"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Repositories */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-dv-accent" />
                Repositories
              </h2>
              <Link href="/repositories" className="text-dv-accent hover:text-dv-accent-hover text-sm">
                View all →
              </Link>
            </div>
            
            <div className="space-y-4">
              {isLoading ? (
                <div className="glass-panel p-8 text-center">
                  <Loader2 className="w-8 h-8 text-dv-accent animate-spin mx-auto mb-4" />
                  <p className="text-dv-text-muted">Loading repositories...</p>
                </div>
              ) : error ? (
                <div className="glass-panel p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={fetchConnectedRepos}
                    className="btn-secondary px-4 py-2 inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {filteredRepos.map((repo) => (
                    <div key={repo.id}>
                      <RepositoryCard repository={{
                        id: repo.id,
                        name: repo.name,
                        fullName: repo.full_name,
                        description: repo.description || undefined,
                        language: repo.language || undefined,
                        isIndexed: repo.is_indexed,
                        lastWalkthrough: repo.indexed_at || null,
                      }} />
                    </div>
                  ))}
                  
                  {filteredRepos.length === 0 && connectedRepos.length > 0 && (
                    <div className="glass-panel p-8 text-center">
                      <FolderGit2 className="w-12 h-12 text-dv-text-muted mx-auto mb-4" />
                      <p className="text-dv-text-muted">No repositories match your search</p>
                    </div>
                  )}

                  {connectedRepos.length === 0 && (
                    <div className="glass-panel p-8 text-center">
                      <FolderGit2 className="w-12 h-12 text-dv-text-muted mx-auto mb-4" />
                      <p className="text-dv-text-muted mb-4">No repositories connected yet</p>
                      <button
                        onClick={() => setIsConnectModalOpen(true)}
                        className="btn-primary px-4 py-2 inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Connect Your First Repository
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Recent Walkthroughs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-dv-purple" />
                Recent
              </h2>
            </div>
            
            <div className="glass-panel divide-y divide-dv-border">
              {recentWalkthroughs.map((wt) => (
                <div
                  key={wt.id}
                  className="p-4 hover:bg-dv-elevated/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/20 transition-colors">
                      <Play className="w-4 h-4 text-dv-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{wt.fileName}</p>
                      <p className="text-sm text-dv-text-muted">{wt.repoName}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-dv-text-muted">{wt.duration}</p>
                      <p className="text-dv-text-muted/50">{wt.viewedAt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

function StatCard({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string
  value: string | number
  icon: React.ReactNode
  color: 'accent' | 'purple' | 'success' | 'warning'
}) {
  const colorClasses = {
    accent: 'bg-dv-accent/10 text-dv-accent',
    purple: 'bg-dv-purple/10 text-dv-purple',
    success: 'bg-dv-success/10 text-dv-success',
    warning: 'bg-dv-warning/10 text-dv-warning',
  }

  return (
    <div className="glass-panel p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-dv-text-muted">{label}</p>
        </div>
      </div>
    </div>
  )
}

