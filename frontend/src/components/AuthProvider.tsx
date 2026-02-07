'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/lib/store'

const PUBLIC_ROUTES = ['/auth/signin', '/auth/callback', '/']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, setToken, logout } = useUserStore()

  useEffect(() => {
    // Rehydrate store on mount
    useUserStore.persist.rehydrate()
  }, [])

  // Simple auth check - only verify token exists, don't call backend
  useEffect(() => {
    // Skip for public routes
    if (PUBLIC_ROUTES.includes(pathname)) return

    // Get token from localStorage
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    // If no token and not on public route, redirect to signin
    if (!storedToken) {
      router.replace('/auth/signin')
      return
    }

    // If we have a token but it's not in the store, update the store
    if (storedToken && storedToken !== token) {
      setToken(storedToken)
    }
  }, [pathname, token, setToken, router])

  // Listen for storage events (token changes in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          setToken(e.newValue)
        } else {
          logout()
          if (!PUBLIC_ROUTES.includes(pathname)) {
            router.replace('/auth/signin')
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [pathname, setToken, logout, router])

  return <>{children}</>
}
