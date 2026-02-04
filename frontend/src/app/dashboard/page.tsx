'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
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
        {/* Header with animations */}
        <motion.div 
          className="flex items-center justify-between mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-2 gradient-text">Dashboard</h1>
            <p className="text-dv-text-muted text-lg">Manage your repositories and walkthroughs</p>
          </motion.div>
          
          <motion.button
            onClick={() => setIsConnectModalOpen(true)}
            className="btn-primary flex items-center gap-2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" />
            Connect Repository
          </motion.button>
        </motion.div>

        {/* Search with animation */}
        <motion.div 
          className="relative mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dv-text-muted" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dv-surface border border-dv-border rounded-xl py-4 pl-12 pr-4
                     text-dv-text placeholder:text-dv-text-muted text-lg
                     focus:outline-none focus:ring-2 focus:ring-dv-accent/50 focus:border-dv-accent
                     transition-all hover:border-dv-border/70"
          />
        </motion.div>

        {/* Stats with animation */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <StatCard
            label="Connected Repos"
            value={connectedRepos.length}
            icon={<FolderGit2 className="w-5 h-5" />}
            color="accent"
            delay={0.5}
          />
          <StatCard
            label="Indexed Files"
            value={247}
            icon={<FileCode className="w-5 h-5" />}
            color="teal"
            delay={0.6}
          />
          <StatCard
            label="Walkthroughs"
            value={38}
            icon={<Play className="w-5 h-5" />}
            color="emerald"
            delay={0.7}
          />
          <StatCard
            label="Total Duration"
            value="2h 34m"
            icon={<Clock className="w-5 h-5" />}
            color="indigo"
            delay={0.8}
          />
        </motion.div>

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
  color,
  delay
}: { 
  label: string
  value: string | number
  icon: React.ReactNode
  color: 'accent' | 'teal' | 'emerald' | 'indigo'
  delay?: number
}) {
  const colorClasses = {
    accent: 'bg-dv-accent/15 text-dv-accent shadow-dv-accent/20',
    teal: 'bg-dv-teal/15 text-dv-teal shadow-dv-teal/20',
    emerald: 'bg-dv-emerald/15 text-dv-emerald shadow-dv-emerald/20',
    indigo: 'bg-dv-indigo/15 text-dv-indigo shadow-dv-indigo/20',
  }

  const bgGradient = {
    accent: 'from-dv-accent/5',
    teal: 'from-dv-teal/5',
    emerald: 'from-dv-emerald/5',
    indigo: 'from-dv-indigo/5',
  }

  return (
    <motion.div 
      className={`glass-panel-elevated p-6 bg-gradient-to-br ${bgGradient[color]} to-transparent group cursor-pointer`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay || 0, duration: 0.6 }}
      whileHover={{ y: -8, scale: 1.02 }}
    >
      <div className="flex items-center gap-4">
        <motion.div 
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]} shadow-lg`}
          whileHover={{ scale: 1.15 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {icon}
        </motion.div>
        <div>
          <p className="text-3xl font-bold text-dv-text">{value}</p>
          <p className="text-sm text-dv-text-muted font-medium">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

