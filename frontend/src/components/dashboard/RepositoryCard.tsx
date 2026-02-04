'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FolderGit2,
  Play,
  Clock,
  Star,
  MoreVertical,
  CheckCircle2,
  Loader2,
  ArrowRight,
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
  const [isHovered, setIsHovered] = React.useState(false)
  
  return (
    <motion.div 
      className="glass-panel-elevated p-6 group relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Gradient overlay on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-dv-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        initial={false}
        animate={isHovered ? { opacity: 0.1 } : { opacity: 0 }}
      />
      
      <div className="flex items-start gap-5 relative z-10">
        {/* Icon with animation */}
        <motion.div 
          className="w-14 h-14 rounded-xl bg-gradient-to-br from-dv-accent/30 to-dv-accent/10 flex items-center justify-center flex-shrink-0 shadow-lg"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <FolderGit2 className="w-7 h-7 text-dv-accent" />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/repository/${repository.id}`}
              className="text-xl font-semibold hover:text-dv-accent transition-colors"
            >
              {repository.name}
            </Link>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {repository.isIndexed ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dv-emerald/20 text-dv-emerald text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Indexed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dv-warning/20 text-dv-warning text-xs font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Indexing...
                </span>
              )}
            </motion.div>
          </div>

          <p className="text-sm text-dv-text-muted mb-4 line-clamp-1 font-medium">
            {repository.description || 'No description provided'}
          </p>

          <div className="flex items-center gap-5 text-xs text-dv-text-muted font-medium">
            {repository.language && (
              <span className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    languageColors[repository.language] || 'bg-gray-400'
                  }`}
                />
                {repository.language}
              </span>
            )}
            {repository.stars !== undefined && (
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                {repository.stars}
              </span>
            )}
            {repository.lastWalkthrough && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {repository.lastWalkthrough}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={isHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              href={`/repository/${repository.id}/walkthrough`}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-dv-accent to-dv-teal text-white hover:shadow-lg hover:shadow-dv-accent/30 font-medium text-sm transition-all"
            >
              <Play className="w-4 h-4" />
              <span>Play</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
          <motion.button 
            className="p-2.5 rounded-lg hover:bg-dv-elevated transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <MoreVertical className="w-5 h-5 text-dv-text-muted" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

import React from 'react'
