'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  FileCode,
  FolderGit2,
  GitBranch,
  Clock,
  Users,
  Star,
  Eye,
  RefreshCw,
  MoreVertical,
  Settings,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { clsx } from 'clsx'

// Mock repository data
const mockRepository = {
  id: 'repo_1',
  name: 'docuverse-core',
  fullName: 'team/docuverse-core',
  description: 'Core documentation engine with AI capabilities for generating interactive code walkthroughs',
  language: 'Python',
  isIndexed: true,
  indexedAt: '2024-01-15T10:30:00Z',
  stars: 128,
  watchers: 45,
  defaultBranch: 'main',
  lastUpdated: '2 hours ago',
  totalFiles: 247,
  totalWalkthroughs: 38,
}

// Mock file structure
const mockFiles = [
  { path: 'src/auth/auth_flow.py', name: 'auth_flow.py', language: 'Python', size: '4.2 KB', hasWalkthrough: true },
  { path: 'src/auth/jwt_handler.py', name: 'jwt_handler.py', language: 'Python', size: '2.8 KB', hasWalkthrough: true },
  { path: 'src/api/routes.py', name: 'routes.py', language: 'Python', size: '6.1 KB', hasWalkthrough: false },
  { path: 'src/services/parser.py', name: 'parser.py', language: 'Python', size: '8.5 KB', hasWalkthrough: true },
  { path: 'src/services/indexer.py', name: 'indexer.py', language: 'Python', size: '5.3 KB', hasWalkthrough: false },
  { path: 'src/main.py', name: 'main.py', language: 'Python', size: '3.2 KB', hasWalkthrough: true },
]

const mockRecentActivity = [
  { type: 'walkthrough', file: 'auth_flow.py', time: '2 hours ago', user: 'you' },
  { type: 'index', file: 'repository', time: '5 hours ago', user: 'system' },
  { type: 'walkthrough', file: 'parser.py', time: '1 day ago', user: 'you' },
]

export default function RepositoryPage({ params }: { params: { id: string } }) {
  const [isReindexing, setIsReindexing] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const handleReindex = async () => {
    setIsReindexing(true)
    // Simulate reindexing
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsReindexing(false)
  }

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-dv-elevated transition-colors mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-dv-text-muted" />
            </Link>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-dv-accent/20 flex items-center justify-center">
                  <FolderGit2 className="w-6 h-6 text-dv-accent" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{mockRepository.name}</h1>
                  <p className="text-dv-text-muted">{mockRepository.fullName}</p>
                </div>
                {mockRepository.isIndexed && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-dv-success/10 text-dv-success text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Indexed
                  </span>
                )}
              </div>
              <p className="text-dv-text-muted max-w-2xl">{mockRepository.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="btn-secondary flex items-center gap-2"
            >
              {isReindexing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Reindex
            </button>
            <Link
              href={`/repository/${params.id}/walkthrough`}
              className="btn-primary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Walkthrough
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<FileCode className="w-5 h-5" />}
            label="Total Files"
            value={mockRepository.totalFiles}
            color="accent"
          />
          <StatCard
            icon={<Play className="w-5 h-5" />}
            label="Walkthroughs"
            value={mockRepository.totalWalkthroughs}
            color="purple"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="Stars"
            value={mockRepository.stars}
            color="warning"
          />
          <StatCard
            icon={<Eye className="w-5 h-5" />}
            label="Watchers"
            value={mockRepository.watchers}
            color="success"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Files list */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileCode className="w-5 h-5 text-dv-accent" />
                Files with Walkthroughs
              </h2>
              <span className="text-sm text-dv-text-muted">
                {mockFiles.filter(f => f.hasWalkthrough).length} of {mockFiles.length} files
              </span>
            </div>

            <div className="glass-panel divide-y divide-dv-border">
              {mockFiles.map((file, index) => (
                <motion.div
                  key={file.path}
                  className="p-4 hover:bg-dv-elevated/50 transition-colors group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/20 transition-colors">
                      <span className="text-lg">🐍</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-dv-text-muted">{file.path}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-dv-text-muted">{file.size}</span>
                      
                      {file.hasWalkthrough ? (
                        <Link
                          href={`/repository/${params.id}/walkthrough?file=${encodeURIComponent(file.path)}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          <span className="text-sm font-medium">Play</span>
                        </Link>
                      ) : (
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dv-elevated text-dv-text-muted hover:bg-dv-surface transition-colors">
                          <Play className="w-4 h-4" />
                          <span className="text-sm font-medium">Generate</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Repository info */}
            <div className="glass-panel p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-dv-text-muted" />
                Repository Info
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-dv-text-muted">Language</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    {mockRepository.language}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dv-text-muted">Default branch</span>
                  <span>{mockRepository.defaultBranch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dv-text-muted">Last updated</span>
                  <span>{mockRepository.lastUpdated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dv-text-muted">Indexed at</span>
                  <span>{new Date(mockRepository.indexedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dv-border">
                <a
                  href={`https://github.com/${mockRepository.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-dv-elevated hover:bg-dv-surface transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>
            </div>

            {/* Recent activity */}
            <div className="glass-panel p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-dv-text-muted" />
                Recent Activity
              </h3>

              <div className="space-y-3">
                {mockRecentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className={clsx(
                      'w-2 h-2 rounded-full mt-1.5',
                      activity.type === 'walkthrough' ? 'bg-dv-accent' : 'bg-dv-success'
                    )} />
                    <div>
                      <p>
                        {activity.type === 'walkthrough' ? 'Walkthrough played' : 'Repository indexed'}
                        {activity.file !== 'repository' && (
                          <span className="text-dv-accent ml-1">{activity.file}</span>
                        )}
                      </p>
                      <p className="text-dv-text-muted">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="glass-panel p-6 border-dv-error/20">
              <h3 className="font-semibold mb-4 text-dv-error flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Danger Zone
              </h3>
              <p className="text-sm text-dv-text-muted mb-4">
                Disconnect this repository and delete all associated walkthroughs.
              </p>
              <button className="w-full py-2 rounded-lg border border-dv-error/50 text-dv-error hover:bg-dv-error/10 transition-colors text-sm">
                Disconnect Repository
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: 'accent' | 'purple' | 'success' | 'warning'
}) {
  const colorClasses = {
    accent: 'bg-dv-accent/10 text-dv-accent',
    purple: 'bg-dv-purple/10 text-dv-purple',
    success: 'bg-dv-success/10 text-dv-success',
    warning: 'bg-dv-warning/10 text-dv-warning',
  }

  return (
    <motion.div
      className="glass-panel p-4"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-dv-text-muted">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

