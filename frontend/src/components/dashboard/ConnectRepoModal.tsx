'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Search,
  FolderGit2,
  Lock,
  Globe,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { clsx } from 'clsx'
import { repositories, GitHubRepository } from '@/lib/api'

interface ConnectRepoModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected?: () => void
}

export function ConnectRepoModal({ isOpen, onClose, onConnected }: ConnectRepoModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([])

  const fetchRepositories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const repos = await repositories.listGitHub()
      setGithubRepos(repos)
    } catch (err) {
      console.error('Failed to fetch repositories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      requestAnimationFrame(() => setVisible(true))
      // Fetch repositories when modal opens
      fetchRepositories()
    } else {
      setVisible(false)
      setSelectedRepo(null)
      setSearchQuery('')
    }
  }, [isOpen, fetchRepositories])

  const filteredRepos = githubRepos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConnect = async () => {
    if (!selectedRepo) return

    setIsConnecting(true)
    setError(null)
    try {
      await repositories.connect(selectedRepo.full_name)
      onConnected?.()
      onClose()
    } catch (err) {
      console.error('Failed to connect repository:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect repository')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={clsx(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl transition-all duration-200',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        <div className="glass-panel overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-dv-border">
            <div>
              <h2 className="text-xl font-semibold">Connect Repository</h2>
              <p className="text-sm text-dv-text-muted mt-1">
                Select a GitHub repository to connect
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
            >
              <X className="w-5 h-5 text-dv-text-muted" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-dv-border">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dv-text-muted" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dv-bg border border-dv-border rounded-xl py-3 pl-12 pr-4
                         text-dv-text placeholder:text-dv-text-muted
                         focus:outline-none focus:ring-2 focus:ring-dv-accent/50 focus:border-dv-accent"
              />
            </div>
          </div>

          {/* Repository list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-dv-accent animate-spin mx-auto mb-3" />
                <p className="text-dv-text-muted">Loading your repositories...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchRepositories}
                  className="btn-secondary px-4 py-2 inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    className={clsx(
                      'w-full p-4 flex items-center gap-4 hover:bg-dv-elevated/50 hover:pl-5 transition-all border-b border-dv-border/50',
                      selectedRepo?.id === repo.id ? 'bg-dv-accent/10' : ''
                    )}
                    onClick={() => setSelectedRepo(repo)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-dv-elevated flex items-center justify-center">
                      <FolderGit2 className="w-5 h-5 text-dv-accent" />
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{repo.name}</span>
                        {repo.private ? (
                          <Lock className="w-3.5 h-3.5 text-dv-text-muted" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-dv-text-muted" />
                        )}
                      </div>
                      <p className="text-sm text-dv-text-muted line-clamp-1">
                        {repo.description || 'No description'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-dv-text-muted">
                      {repo.language && (
                        <span className="px-2 py-1 rounded-md bg-dv-elevated text-xs">
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {repo.stars}
                        </span>
                      )}
                      {selectedRepo?.id === repo.id && (
                        <CheckCircle2 className="w-5 h-5 text-dv-accent" />
                      )}
                    </div>
                  </button>
                ))}

                {filteredRepos.length === 0 && githubRepos.length > 0 && (
                  <div className="p-8 text-center text-dv-text-muted">
                    No repositories match your search
                  </div>
                )}

                {githubRepos.length === 0 && !isLoading && (
                  <div className="p-8 text-center text-dv-text-muted">
                    <FolderGit2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No repositories found in your GitHub account</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-dv-border">
            {error && !isLoading && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="btn-secondary px-6"
                disabled={isConnecting}
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!selectedRepo || isConnecting || isLoading}
                className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>Connect Repository</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
