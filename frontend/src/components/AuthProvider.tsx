'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/lib/store'

const PUBLIC_ROUTES = ['/auth/signin', '/auth/callback', '/', '/login']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, setToken, logout } = useUserStore()
  const [isHydrated, setIsHydrated] = useState(false)

  // Rehydrate store on mount — must complete before auth check
  useEffect(() => {
    useUserStore.persist.rehydrate()
    setIsHydrated(true)
  }, [])

  // Simple auth check — only runs after hydration is complete
  useEffect(() => {
    if (!isHydrated) return

    // Skip for public routes
    if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) return

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
  }, [isHydrated, pathname, token, setToken, router])

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
