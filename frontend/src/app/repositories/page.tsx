'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  CheckCircle2,
  Loader2,
  Clock,
  Star,
  MoreVertical,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { ConnectRepoModal } from '@/components/dashboard/ConnectRepoModal'
import { clsx } from 'clsx'

// Mock repositories data
const mockRepositories = [
  {
    id: 'repo_1',
    name: 'docuverse-core',
    fullName: 'team/docuverse-core',
    description: 'Core documentation engine with AI capabilities',
    language: 'Python',
    isIndexed: true,
    indexedAt: '2024-01-15T10:30:00Z',
    stars: 128,
    walkthroughs: 15,
    updatedAt: '2 hours ago',
  },
  {
    id: 'repo_2',
    name: 'frontend-app',
    fullName: 'team/frontend-app',
    description: 'Next.js frontend application with modern UI',
    language: 'TypeScript',
    isIndexed: true,
    indexedAt: '2024-01-14T15:20:00Z',
    stars: 45,
    walkthroughs: 8,
    updatedAt: '1 day ago',
  },
  {
    id: 'repo_3',
    name: 'api-gateway',
    fullName: 'team/api-gateway',
    description: 'API Gateway service with authentication and rate limiting',
    language: 'Go',
    isIndexed: false,
    indexedAt: null,
    stars: 23,
    walkthroughs: 0,
    updatedAt: '3 days ago',
  },
  {
    id: 'repo_4',
    name: 'ml-pipeline',
    fullName: 'team/ml-pipeline',
    description: 'Machine learning data processing pipeline',
    language: 'Python',
    isIndexed: true,
    indexedAt: '2024-01-10T08:00:00Z',
    stars: 67,
    walkthroughs: 12,
    updatedAt: '5 days ago',
  },
  {
    id: 'repo_5',
    name: 'mobile-app',
    fullName: 'team/mobile-app',
    description: 'React Native mobile application',
    language: 'TypeScript',
    isIndexed: false,
    indexedAt: null,
    stars: 34,
    walkthroughs: 0,
    updatedAt: '1 week ago',
  },
]

const languageColors: Record<string, string> = {
  Python: 'bg-blue-500',
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-yellow-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-orange-500',
}

type ViewMode = 'grid' | 'list'
type FilterMode = 'all' | 'indexed' | 'pending'

export default function RepositoriesPage() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  const filteredRepos = mockRepositories.filter(repo => {
    // Apply filter
    if (filterMode === 'indexed' && !repo.isIndexed) return false
    if (filterMode === 'pending' && repo.isIndexed) return false

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        repo.name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query) ||
        repo.language?.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Repositories</h1>
            <p className="text-dv-text-muted">
              Manage your connected GitHub repositories
            </p>
          </div>

          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Connect Repository
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dv-text-muted" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dv-surface border border-dv-border rounded-xl py-3 pl-12 pr-4
                       text-dv-text placeholder:text-dv-text-muted
                       focus:outline-none focus:ring-2 focus:ring-dv-accent/50 focus:border-dv-accent"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-1 p-1 bg-dv-surface rounded-lg border border-dv-border">
            {(['all', 'indexed', 'pending'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize',
                  filterMode === mode
                    ? 'bg-dv-accent/10 text-dv-accent'
                    : 'text-dv-text-muted hover:text-dv-text'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="flex items-center gap-1 p-1 bg-dv-surface rounded-lg border border-dv-border">
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-dv-accent/10 text-dv-accent' : 'text-dv-text-muted'
              )}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-dv-accent/10 text-dv-accent' : 'text-dv-text-muted'
              )}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Repository list */}
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="list"
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredRepos.map((repo, index) => (
                <motion.div
                  key={repo.id}
                  className="glass-panel p-5 hover:bg-dv-elevated/50 transition-colors group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/20 transition-colors">
                      <FolderGit2 className="w-6 h-6 text-dv-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/repository/${repo.id}`}
                          className="text-lg font-semibold hover:text-dv-accent transition-colors"
                        >
                          {repo.name}
                        </Link>
                        {repo.isIndexed ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-dv-success/10 text-dv-success text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Indexed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-dv-warning/10 text-dv-warning text-xs">
                            <Loader2 className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-dv-text-muted line-clamp-1">
                        {repo.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-dv-text-muted">
                      {repo.language && (
                        <span className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full ${languageColors[repo.language] || 'bg-gray-400'}`} />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        {repo.stars}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {repo.updatedAt}
                      </span>
                      <span className="w-20 text-center">
                        {repo.walkthroughs} walkthroughs
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/repository/${repo.id}`}
                        className="px-4 py-2 rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors text-sm font-medium"
                      >
                        View
                      </Link>
                      <button className="p-2 rounded-lg hover:bg-dv-elevated transition-colors">
                        <MoreVertical className="w-5 h-5 text-dv-text-muted" />
                      </button>
                    </div>
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
              {filteredRepos.map((repo, index) => (
                <motion.div
                  key={repo.id}
                  className="glass-panel p-5 hover:bg-dv-elevated/50 transition-colors group"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/20 transition-colors">
                      <FolderGit2 className="w-6 h-6 text-dv-accent" />
                    </div>
                    <button className="p-2 rounded-lg hover:bg-dv-elevated transition-colors">
                      <MoreVertical className="w-5 h-5 text-dv-text-muted" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/repository/${repo.id}`}
                        className="font-semibold hover:text-dv-accent transition-colors"
                      >
                        {repo.name}
                      </Link>
                      {repo.isIndexed ? (
                        <CheckCircle2 className="w-4 h-4 text-dv-success" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-dv-warning animate-spin" />
                      )}
                    </div>
                    <p className="text-sm text-dv-text-muted line-clamp-2">
                      {repo.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-dv-text-muted mb-4">
                    {repo.language && (
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${languageColors[repo.language] || 'bg-gray-400'}`} />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {repo.stars}
                    </span>
                  </div>

                  <Link
                    href={`/repository/${repo.id}`}
                    className="block w-full py-2 text-center rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors text-sm font-medium"
                  >
                    View Repository
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {filteredRepos.length === 0 && (
          <div className="glass-panel p-12 text-center">
            <FolderGit2 className="w-12 h-12 text-dv-text-muted mx-auto mb-4" />
            <p className="text-xl font-semibold mb-2">No repositories found</p>
            <p className="text-dv-text-muted mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Connect your first GitHub repository to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="btn-primary"
              >
                Connect Repository
              </button>
            )}
          </div>
        )}
      </main>

      <ConnectRepoModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
    </div>
  )
}

