'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2,
  LayoutDashboard,
  FolderGit2,
  Play,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  User,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
  { href: '/walkthroughs', label: 'Walkthroughs', icon: Play },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <aside className="h-screen w-64 bg-dv-surface border-r border-dv-border flex flex-col">
        <div className="p-4 border-b border-dv-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dv-accent to-dv-purple flex items-center justify-center">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">DocuVerse</span>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={clsx(
        'h-screen bg-dv-surface border-r border-dv-border flex flex-col transition-all duration-200 relative',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-dv-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dv-accent to-dv-purple flex items-center justify-center flex-shrink-0">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <span 
            className={clsx(
              'text-xl font-bold gradient-text transition-opacity duration-200',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            )}
          >
            DocuVerse
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group',
                  isActive
                    ? 'bg-gradient-to-r from-dv-accent/20 to-dv-accent/10 text-dv-accent'
                    : 'text-dv-text-muted hover:bg-dv-elevated/50 hover:text-dv-text'
                )}
              >
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                </motion.div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      className="transition-opacity duration-200"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !isCollapsed && (
                  <motion.div 
                    className="ml-auto w-2 h-2 rounded-full bg-dv-accent shadow-lg shadow-dv-accent/50"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-dv-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dv-elevated">
          <div className="w-8 h-8 rounded-full bg-dv-accent/20 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-dv-accent" />
          </div>
          <div 
            className={clsx(
              'flex-1 min-w-0 transition-opacity duration-200',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            )}
          >
            <p className="text-sm font-medium truncate">Developer</p>
            <p className="text-xs text-dv-text-muted truncate">Free Plan</p>
          </div>
        </div>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-dv-surface border border-dv-border flex items-center justify-center hover:bg-dv-elevated transition-colors z-10"
      >
        <ChevronLeft
          className={clsx(
            'w-4 h-4 text-dv-text-muted transition-transform duration-200',
            isCollapsed && 'rotate-180'
          )}
        />
      </button>
    </aside>
  )
}
