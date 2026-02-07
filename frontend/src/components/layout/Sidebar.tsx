'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Code2,
  LayoutDashboard,
  FolderGit2,
  Play,
  Settings,
  ChevronLeft,
  LogOut,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { useUserStore } from '@/lib/store'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
  { href: '/walkthroughs', label: 'Walkthroughs', icon: Play },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, logout } = useUserStore()

  useEffect(() => { setMounted(true) }, [])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!mounted) {
    return (
      <aside className="h-screen w-[260px] bg-dv-surface border-r border-dv-border/50 flex flex-col" />
    )
  }

  return (
    <aside
      className={clsx(
        'h-screen bg-dv-surface/80 backdrop-blur-xl border-r border-dv-border/40 flex flex-col transition-all duration-300 relative group/sidebar',
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-dv-border/30">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-dv-accent flex items-center justify-center flex-shrink-0 shadow-glow-sm">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span
            className={clsx(
              'text-lg font-bold text-dv-text tracking-tight transition-all duration-300',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            )}
          >
            Docu<span className="text-dv-accent">Verse</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group/item relative',
                isActive
                  ? 'bg-dv-accent/10 text-dv-accent'
                  : 'text-dv-text-muted hover:text-dv-text hover:bg-dv-elevated/60'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-dv-accent" />
              )}
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span
                className={clsx(
                  'text-sm font-medium transition-all duration-300',
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-dv-border/30">
        <div
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl',
            isCollapsed ? 'justify-center' : ''
          )}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-dv-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-dv-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-dv-accent">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div
            className={clsx(
              'flex-1 min-w-0 transition-all duration-300',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            )}
          >
            <p className="text-sm font-medium truncate">{user?.username || 'Developer'}</p>
            <p className="text-xs text-dv-text-muted truncate">{user?.email || 'Connected'}</p>
          </div>
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-dv-text-muted hover:text-dv-error hover:bg-dv-error/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={clsx(
          'absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-dv-surface border border-dv-border/60 flex items-center justify-center',
          'hover:bg-dv-elevated transition-all z-10',
          'opacity-0 group-hover/sidebar:opacity-100'
        )}
      >
        <ChevronLeft
          className={clsx(
            'w-3.5 h-3.5 text-dv-text-muted transition-transform duration-300',
            isCollapsed && 'rotate-180'
          )}
        />
      </button>
    </aside>
  )
}
