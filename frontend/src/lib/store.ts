/**
 * Zustand Global State Store
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'

// Hook to rehydrate stores on client side
export function useHydration() {
  useEffect(() => {
    useUserStore.persist.rehydrate()
    useUIStore.persist.rehydrate()
  }, [])
}

// ============================================================
// User Store
// ============================================================

interface User {
  id: string
  username: string
  email: string | null
  avatarUrl: string | null
}

interface UserState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => {
        if (typeof window !== 'undefined') {
          if (token) {
            localStorage.setItem('token', token)
          } else {
            localStorage.removeItem('token')
          }
        }
        set({ token })
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
        }
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'docuverse-user',
      partialize: (state) => ({ token: state.token }),
      skipHydration: true,
    }
  )
)

// ============================================================
// Walkthrough Store
// ============================================================

interface WalkthroughState {
  currentSegmentIndex: number
  isPlaying: boolean
  playbackSpeed: number
  isMuted: boolean
  showTranscript: boolean
  viewMode: 'developer' | 'manager'
  setCurrentSegmentIndex: (index: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setIsMuted: (muted: boolean) => void
  setShowTranscript: (show: boolean) => void
  setViewMode: (mode: 'developer' | 'manager') => void
  reset: () => void
}

export const useWalkthroughStore = create<WalkthroughState>()((set) => ({
  currentSegmentIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  isMuted: false,
  showTranscript: true,
  viewMode: 'developer',
  setCurrentSegmentIndex: (index) => set({ currentSegmentIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setShowTranscript: (show) => set({ showTranscript: show }),
  setViewMode: (mode) => set({ viewMode: mode }),
  reset: () =>
    set({
      currentSegmentIndex: 0,
      isPlaying: false,
      playbackSpeed: 1,
      isMuted: false,
      showTranscript: true,
    }),
}))

// ============================================================
// Repository Store
// ============================================================

interface Repository {
  id: string
  name: string
  fullName: string
  description: string | null
  language: string | null
  isIndexed: boolean
}

interface RepositoryState {
  repositories: Repository[]
  currentRepository: Repository | null
  selectedFile: string | null
  setRepositories: (repos: Repository[]) => void
  setCurrentRepository: (repo: Repository | null) => void
  setSelectedFile: (path: string | null) => void
  addRepository: (repo: Repository) => void
  removeRepository: (id: string) => void
  updateRepository: (id: string, updates: Partial<Repository>) => void
}

export const useRepositoryStore = create<RepositoryState>()((set) => ({
  repositories: [],
  currentRepository: null,
  selectedFile: null,
  setRepositories: (repositories) => set({ repositories }),
  setCurrentRepository: (currentRepository) => set({ currentRepository }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  addRepository: (repo) =>
    set((state) => ({ repositories: [...state.repositories, repo] })),
  removeRepository: (id) =>
    set((state) => ({
      repositories: state.repositories.filter((r) => r.id !== id),
      currentRepository:
        state.currentRepository?.id === id ? null : state.currentRepository,
    })),
  updateRepository: (id, updates) =>
    set((state) => ({
      repositories: state.repositories.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
      currentRepository:
        state.currentRepository?.id === id
          ? { ...state.currentRepository, ...updates }
          : state.currentRepository,
    })),
}))

// ============================================================
// UI Store
// ============================================================

interface UIState {
  sidebarCollapsed: boolean
  activePanel: 'files' | 'diagram' | 'sandbox'
  theme: 'dark' | 'light'
  setSidebarCollapsed: (collapsed: boolean) => void
  setActivePanel: (panel: 'files' | 'diagram' | 'sandbox') => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activePanel: 'files',
      theme: 'dark',
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setActivePanel: (panel) => set({ activePanel: panel }),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'docuverse-ui',
      skipHydration: true,
    }
  )
)

