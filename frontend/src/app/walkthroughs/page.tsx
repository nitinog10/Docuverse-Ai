'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Play,
  Search,
  Clock,
  FileCode,
  Filter,
  SortAsc,
  Trash2,
  MoreVertical,
  Users,
  Eye,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { clsx } from 'clsx'

// Mock walkthroughs data
const mockWalkthroughs = [
  {
    id: 'wt_1',
    title: 'Authentication Flow Walkthrough',
    filePath: 'src/auth/auth_flow.py',
    repoName: 'docuverse-core',
    repoId: 'repo_1',
    duration: 245,
    viewMode: 'developer',
    viewCount: 34,
    createdAt: '2024-01-15T10:30:00Z',
    language: 'python',
  },
  {
    id: 'wt_2',
    title: 'JWT Handler Overview',
    filePath: 'src/auth/jwt_handler.py',
    repoName: 'docuverse-core',
    repoId: 'repo_1',
    duration: 180,
    viewMode: 'developer',
    viewCount: 22,
    createdAt: '2024-01-14T15:20:00Z',
    language: 'python',
  },
  {
    id: 'wt_3',
    title: 'User Dashboard Component',
    filePath: 'src/components/UserDashboard.tsx',
    repoName: 'frontend-app',
    repoId: 'repo_2',
    duration: 195,
    viewMode: 'developer',
    viewCount: 18,
    createdAt: '2024-01-13T09:45:00Z',
    language: 'typescript',
  },
  {
    id: 'wt_4',
    title: 'API Routes Configuration',
    filePath: 'src/api/routes.py',
    repoName: 'docuverse-core',
    repoId: 'repo_1',
    duration: 320,
    viewMode: 'developer',
    viewCount: 45,
    createdAt: '2024-01-12T14:00:00Z',
    language: 'python',
  },
  {
    id: 'wt_5',
    title: 'Payment Gateway (Business Overview)',
    filePath: 'src/services/payment.py',
    repoName: 'docuverse-core',
    repoId: 'repo_1',
    duration: 150,
    viewMode: 'manager',
    viewCount: 12,
    createdAt: '2024-01-11T11:30:00Z',
    language: 'python',
  },
]

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

export default function WalkthroughsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'developer' | 'manager'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'views' | 'duration'>('recent')

  const filteredWalkthroughs = mockWalkthroughs
    .filter(wt => {
      if (filterMode !== 'all' && wt.viewMode !== filterMode) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          wt.title.toLowerCase().includes(query) ||
          wt.filePath.toLowerCase().includes(query) ||
          wt.repoName.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === 'views') {
        return b.viewCount - a.viewCount
      }
      return b.duration - a.duration
    })

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Walkthroughs</h1>
            <p className="text-dv-text-muted">
              All your generated code walkthroughs in one place
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dv-text-muted" />
            <input
              type="text"
              placeholder="Search walkthroughs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dv-surface border border-dv-border rounded-xl py-3 pl-12 pr-4
                       text-dv-text placeholder:text-dv-text-muted
                       focus:outline-none focus:ring-2 focus:ring-dv-accent/50 focus:border-dv-accent"
            />
          </div>

          {/* View mode filter */}
          <div className="flex items-center gap-1 p-1 bg-dv-surface rounded-lg border border-dv-border">
            {(['all', 'developer', 'manager'] as const).map((mode) => (
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

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-dv-text-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-dv-surface border border-dv-border rounded-lg py-2 px-3
                       text-sm text-dv-text focus:outline-none focus:ring-2 focus:ring-dv-accent/50"
            >
              <option value="recent">Most Recent</option>
              <option value="views">Most Viewed</option>
              <option value="duration">Longest</option>
            </select>
          </div>
        </div>

        {/* Walkthroughs grid */}
        <div className="grid gap-4">
          {filteredWalkthroughs.map((wt, index) => (
            <motion.div
              key={wt.id}
              className="glass-panel p-5 hover:bg-dv-elevated/50 transition-colors group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center gap-4">
                {/* Play button */}
                <Link
                  href={`/repository/${wt.repoId}/walkthrough?file=${encodeURIComponent(wt.filePath)}`}
                  className="w-16 h-16 rounded-xl bg-dv-elevated flex items-center justify-center
                           group-hover:bg-dv-accent/20 transition-colors"
                >
                  <Play className="w-6 h-6 text-dv-accent ml-1" />
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/repository/${wt.repoId}/walkthrough?file=${encodeURIComponent(wt.filePath)}`}
                      className="text-lg font-semibold hover:text-dv-accent transition-colors truncate"
                    >
                      {wt.title}
                    </Link>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-xs',
                      wt.viewMode === 'developer'
                        ? 'bg-dv-accent/10 text-dv-accent'
                        : 'bg-dv-purple/10 text-dv-purple'
                    )}>
                      {wt.viewMode}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-dv-text-muted">
                    <span className="flex items-center gap-1">
                      <FileCode className="w-4 h-4" />
                      {wt.filePath}
                    </span>
                    <span className="text-dv-border">•</span>
                    <span>{wt.repoName}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{formatDuration(wt.duration)}</p>
                    <p className="text-xs text-dv-text-muted">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {wt.viewCount}
                    </p>
                    <p className="text-xs text-dv-text-muted">Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm">{formatDate(wt.createdAt)}</p>
                    <p className="text-xs text-dv-text-muted">Created</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/repository/${wt.repoId}/walkthrough?file=${encodeURIComponent(wt.filePath)}`}
                    className="px-4 py-2 rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors text-sm font-medium"
                  >
                    Play
                  </Link>
                  <button className="p-2 rounded-lg hover:bg-dv-elevated transition-colors">
                    <MoreVertical className="w-5 h-5 text-dv-text-muted" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredWalkthroughs.length === 0 && (
            <div className="glass-panel p-12 text-center">
              <Play className="w-12 h-12 text-dv-text-muted mx-auto mb-4" />
              <p className="text-xl font-semibold mb-2">No walkthroughs found</p>
              <p className="text-dv-text-muted">
                Generate walkthroughs from your connected repositories
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

