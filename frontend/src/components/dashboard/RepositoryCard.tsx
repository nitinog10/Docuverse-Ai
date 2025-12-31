'use client'

import Link from 'next/link'
import {
  FolderGit2,
  Play,
  Clock,
  Star,
  MoreVertical,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

interface Repository {
  id: string
  name: string
  fullName: string
  description?: string
  language?: string
  isIndexed: boolean
  lastWalkthrough?: string | null
  stars?: number
}

const languageColors: Record<string, string> = {
  Python: 'bg-blue-500',
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-yellow-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-orange-500',
  Java: 'bg-red-500',
}

export function RepositoryCard({ repository }: { repository: Repository }) {
  return (
    <div className="glass-panel p-5 hover:bg-dv-elevated/50 hover:-translate-y-0.5 transition-all group">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/20 transition-colors">
          <FolderGit2 className="w-6 h-6 text-dv-accent" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/repository/${repository.id}`}
              className="text-lg font-semibold hover:text-dv-accent transition-colors"
            >
              {repository.name}
            </Link>
            {repository.isIndexed ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-dv-success/10 text-dv-success text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Indexed
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-dv-warning/10 text-dv-warning text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Indexing...
              </span>
            )}
          </div>

          <p className="text-sm text-dv-text-muted mb-3 line-clamp-1">
            {repository.description || 'No description'}
          </p>

          <div className="flex items-center gap-4 text-sm text-dv-text-muted">
            {repository.language && (
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-full ${
                    languageColors[repository.language] || 'bg-gray-400'
                  }`}
                />
                {repository.language}
              </span>
            )}
            {repository.stars !== undefined && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                {repository.stars}
              </span>
            )}
            {repository.lastWalkthrough && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {repository.lastWalkthrough}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/repository/${repository.id}/walkthrough`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dv-accent/10 text-dv-accent hover:bg-dv-accent/20 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium">Play</span>
          </Link>
          <button className="p-2 rounded-lg hover:bg-dv-elevated transition-colors">
            <MoreVertical className="w-5 h-5 text-dv-text-muted" />
          </button>
        </div>
      </div>
    </div>
  )
}
