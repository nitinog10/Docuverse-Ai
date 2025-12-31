'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  File,
  Search,
} from 'lucide-react'
import { clsx } from 'clsx'

interface FileNode {
  id: string
  path: string
  name: string
  isDirectory: boolean
  language?: string
  children?: FileNode[]
}

interface FileExplorerProps {
  files: FileNode[]
  selectedFile: string
  onSelectFile: (path: string) => void
}

const languageIcons: Record<string, string> = {
  python: '🐍',
  javascript: '📜',
  typescript: '💎',
  java: '☕',
  go: '🔵',
  rust: '🦀',
}

export function FileExplorer({ files, selectedFile, onSelectFile }: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src_auth']))

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filterFiles = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes

    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.isDirectory) {
        const filteredChildren = filterFiles(node.children || [], query)
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren })
        }
      } else if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node)
      }
      return acc
    }, [])
  }

  const filteredFiles = filterFiles(files, searchQuery)

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-dv-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dv-text-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dv-bg border border-dv-border rounded-lg py-2 pl-9 pr-3
                     text-sm text-dv-text placeholder:text-dv-text-muted
                     focus:outline-none focus:ring-2 focus:ring-dv-accent/50 focus:border-dv-accent"
          />
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-auto p-2">
        {filteredFiles.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            onSelectFile={onSelectFile}
            onToggleFolder={toggleFolder}
          />
        ))}
      </div>
    </div>
  )
}

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  selectedFile: string
  expandedFolders: Set<string>
  onSelectFile: (path: string) => void
  onToggleFolder: (id: string) => void
}

function FileTreeNode({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onSelectFile,
  onToggleFolder,
}: FileTreeNodeProps) {
  const isExpanded = expandedFolders.has(node.id)
  const isSelected = selectedFile === node.path
  const paddingLeft = depth * 16 + 8

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.id)}
          className={clsx(
            'w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors text-left',
            'hover:bg-dv-elevated'
          )}
          style={{ paddingLeft }}
        >
          <motion.div
            initial={false}
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.1 }}
          >
            <ChevronRight className="w-4 h-4 text-dv-text-muted" />
          </motion.div>
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-dv-accent" />
          ) : (
            <Folder className="w-4 h-4 text-dv-accent" />
          )}
          <span className="text-sm">{node.name}</span>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {node.children.map((child) => (
                <FileTreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  selectedFile={selectedFile}
                  expandedFolders={expandedFolders}
                  onSelectFile={onSelectFile}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={clsx(
        'w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors text-left',
        isSelected ? 'bg-dv-accent/10 text-dv-accent' : 'hover:bg-dv-elevated'
      )}
      style={{ paddingLeft: paddingLeft + 20 }}
    >
      <span className="text-sm">
        {node.language && languageIcons[node.language] ? (
          languageIcons[node.language]
        ) : (
          <FileCode className="w-4 h-4 text-dv-text-muted" />
        )}
      </span>
      <span className="text-sm truncate">{node.name}</span>
    </button>
  )
}

