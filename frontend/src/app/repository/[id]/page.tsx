'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Play,
  FileCode,
  FolderGit2,
  GitBranch,
  Clock,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  ChevronRight,
  File,
  Folder,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { repositories, files, FileNode, Repository } from '@/lib/api'
import { formatRelativeTime, getLanguageFromPath } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function RepositoryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [repo, setRepo] = useState<Repository | null>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFilesLoading, setIsFilesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReindexing, setIsReindexing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const repoData = await repositories.get(params.id)
      setRepo(repoData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  const fetchFiles = useCallback(async () => {
    setIsFilesLoading(true)
    try {
      const tree = await files.getTree(params.id)
      setFileTree(tree)
    } catch {
      // Files may not be available if not indexed
    } finally {
      setIsFilesLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchData()
    fetchFiles()
  }, [fetchData, fetchFiles])

  const handleReindex = async () => {
    setIsReindexing(true)
    try {
      await repositories.index(params.id)
      toast.success('Re-indexing started')
      // Refresh after a moment
      setTimeout(() => { fetchData(); fetchFiles() }, 2000)
    } catch {
      toast.error('Failed to start re-indexing')
    } finally {
      setIsReindexing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure? This will remove the repository and all walkthroughs.')) return
    setIsDeleting(true)
    try {
      await repositories.delete(params.id)
      toast.success('Repository disconnected')
      router.push('/repositories')
    } catch {
      toast.error('Failed to disconnect repository')
    } finally {
      setIsDeleting(false)
    }
  }

  // Flatten files for list display
  const flatFiles = flattenFileTree(fileTree).filter((f) => !f.is_directory).slice(0, 30)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dv-bg flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-dv-accent animate-spin" />
        </main>
      </div>
    )
  }

  if (error || !repo) {
    return (
      <div className="min-h-screen bg-dv-bg flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-dv-error mx-auto mb-3" />
            <p className="text-sm text-dv-error mb-4">{error || 'Repository not found'}</p>
            <Link href="/repositories" className="btn-secondary">Back to Repositories</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-dv-bg/80 backdrop-blur-lg border-b border-dv-border/30">
          <div className="flex items-center gap-3 px-8 h-16">
            <Link href="/repositories" className="p-1.5 rounded-lg hover:bg-dv-elevated transition-colors">
              <ArrowLeft className="w-4 h-4 text-dv-text-muted" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-dv-text-muted">
              <span>Repositories</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-dv-text font-medium">{repo.name}</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="btn-secondary flex items-center gap-2"
            >
              {isReindexing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Reindex
            </button>
            <Link href={`/repository/${params.id}/walkthrough`} className="btn-primary flex items-center gap-2">
              <Play className="w-3.5 h-3.5" />
              Walkthrough
            </Link>
            <Link href={`/repository/${params.id}/documentation`} className="btn-secondary flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5" />
              Documentation
            </Link>
          </div>
        </div>

        <div className="px-8 py-6 max-w-6xl">
          {/* Repo header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-dv-accent/10 flex items-center justify-center flex-shrink-0">
              <FolderGit2 className="w-6 h-6 text-dv-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-display-sm">{repo.name}</h1>
                {repo.is_indexed ? (
                  <span className="badge-success"><CheckCircle2 className="w-3 h-3 mr-1" /> Indexed</span>
                ) : (
                  <span className="badge-warning">Pending</span>
                )}
              </div>
              <p className="text-sm text-dv-text-secondary">{repo.full_name}</p>
              {repo.description && (
                <p className="text-sm text-dv-text-muted mt-2 max-w-2xl">{repo.description}</p>
              )}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-dv-accent/10 flex items-center justify-center text-dv-accent">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{flatFiles.length}</p>
                <p className="text-xs text-dv-text-muted">Files</p>
              </div>
            </div>
            {repo.language && (
              <div className="card flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-dv-purple/10 flex items-center justify-center text-dv-purple">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{repo.language}</p>
                  <p className="text-xs text-dv-text-muted">Language</p>
                </div>
              </div>
            )}
            {repo.indexed_at && (
              <div className="card flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-dv-success/10 flex items-center justify-center text-dv-success">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{formatRelativeTime(repo.indexed_at)}</p>
                  <p className="text-xs text-dv-text-muted">Last indexed</p>
                </div>
              </div>
            )}
            <div className="card flex items-center gap-3">
              <a
                href={`https://github.com/${repo.full_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-dv-accent hover:text-dv-accent-hover transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* File list */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-medium text-dv-text-secondary uppercase tracking-wider mb-4">
                Files
              </h3>

              {isFilesLoading ? (
                <div className="card flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-dv-accent animate-spin mr-3" />
                  <span className="text-sm text-dv-text-muted">Loading file tree…</span>
                </div>
              ) : flatFiles.length === 0 ? (
                <div className="card text-center py-12">
                  <FileCode className="w-8 h-8 text-dv-text-muted mx-auto mb-3" />
                  <p className="text-sm text-dv-text-muted mb-4">
                    {repo.is_indexed ? 'No files found' : 'Index this repository to browse files'}
                  </p>
                  {!repo.is_indexed && (
                    <button onClick={handleReindex} disabled={isReindexing} className="btn-primary inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Index Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="card p-0 divide-y divide-dv-border/30 overflow-hidden">
                  {flatFiles.map((file, i) => (
                    <motion.div
                      key={file.path}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-dv-elevated/40 transition-colors group"
                    >
                      <File className="w-4 h-4 text-dv-text-muted flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-dv-text-muted truncate">{file.path}</p>
                      </div>
                      {file.language && (
                        <span className="text-xs text-dv-text-muted">{file.language}</span>
                      )}
                      <Link
                        href={`/repository/${params.id}/walkthrough?file=${encodeURIComponent(file.path)}`}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Play className="w-3 h-3" /> Walkthrough
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Quick actions */}
              <div className="card">
                <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href={`/repository/${params.id}/walkthrough`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-dv-elevated/50 hover:bg-dv-elevated transition-colors group"
                  >
                    <Play className="w-4 h-4 text-dv-accent" />
                    <span className="text-sm">Start Walkthrough</span>
                    <ChevronRight className="w-3.5 h-3.5 text-dv-text-muted ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <button
                    onClick={handleReindex}
                    disabled={isReindexing}
                    className="flex items-center gap-3 p-3 rounded-xl bg-dv-elevated/50 hover:bg-dv-elevated transition-colors w-full text-left"
                  >
                    {isReindexing ? <Loader2 className="w-4 h-4 animate-spin text-dv-text-muted" /> : <RefreshCw className="w-4 h-4 text-dv-text-muted" />}
                    <span className="text-sm">Re-index Repository</span>
                  </button>
                </div>
              </div>

              {/* Danger zone */}
              <div className="card border-dv-error/20">
                <h3 className="text-sm font-medium text-dv-error mb-3 flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" /> Danger Zone
                </h3>
                <p className="text-xs text-dv-text-muted mb-3">
                  Disconnect this repository and delete all walkthroughs.
                </p>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full py-2 rounded-lg border border-dv-error/40 text-dv-error text-xs font-medium hover:bg-dv-error/10 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Disconnecting…' : 'Disconnect Repository'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/** Recursively flatten a file tree into a flat array */
function flattenFileTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.children?.length) {
      result.push(...flattenFileTree(node.children))
    }
  }
  return result
}

