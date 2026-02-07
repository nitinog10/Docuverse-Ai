'use client'

import Link from 'next/link'
import {
  FolderGit2,
  Play,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface Repository {
  id: string
  name: string
  fullName: string
  description?: string
  language?: string
  isIndexed: boolean
  indexedAt?: string | null
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
    <Link
      href={`/repository/${repository.id}`}
      className="card-hover flex items-center gap-4 group"
    >
      <div className="w-10 h-10 rounded-xl bg-dv-elevated flex items-center justify-center group-hover:bg-dv-accent/15 transition-colors flex-shrink-0">
        <FolderGit2 className="w-5 h-5 text-dv-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm group-hover:text-dv-accent transition-colors truncate">
            {repository.fullName || repository.name}
          </span>
          {repository.isIndexed ? (
            <span className="badge-success flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Indexed
            </span>
          ) : (
            <span className="badge-warning flex-shrink-0">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Pending
            </span>
          )}
        </div>
        <p className="text-xs text-dv-text-muted truncate">
          {repository.description || 'No description'}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {repository.language && (
          <span className="flex items-center gap-1.5 text-xs text-dv-text-muted">
            <span className={`w-2 h-2 rounded-full ${languageColors[repository.language] || 'bg-zinc-400'}`} />
            {repository.language}
          </span>
        )}
        {repository.indexedAt && (
          <span className="text-xs text-dv-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(repository.indexedAt)}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-dv-text-muted group-hover:text-dv-accent group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}
