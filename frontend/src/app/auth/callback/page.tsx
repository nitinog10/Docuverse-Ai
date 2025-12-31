'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Code2, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useUserStore } from '@/lib/store'

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-dv-bg flex items-center justify-center">
      <div className="fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dv-accent to-dv-purple flex items-center justify-center">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold gradient-text">DocuVerse</span>
        </div>
        <div className="glass-panel p-8 min-w-[300px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-dv-accent animate-spin" />
            <p className="text-dv-text">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inner component that uses useSearchParams
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const { setToken, setUser } = useUserStore()

  const handleCallback = useCallback(async () => {
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setStatus('error')
      setError(errorParam)
      return
    }

    if (!token) {
      setStatus('error')
      setError('No authentication token received')
      return
    }

    try {
      // Store the token first (this also saves to localStorage)
      setToken(token)
      
      // Wait a moment for localStorage to be updated
      await new Promise(resolve => setTimeout(resolve, 100))

      // Fetch user info using the API client (which reads from localStorage)
      const api = await import('@/lib/api')
      const user = await api.auth.getMe()
      
      setUser({
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url,
      })

      setStatus('success')

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.replace('/dashboard')
      }, 1500)
    } catch (err) {
      console.error('Auth callback error:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to complete authentication')
    }
  }, [searchParams, router, setToken, setUser])

  useEffect(() => {
    handleCallback()
  }, [handleCallback])

  return (
    <div className="min-h-screen bg-dv-bg flex items-center justify-center">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20" />
      
      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dv-accent to-dv-purple flex items-center justify-center">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold gradient-text">DocuVerse</span>
        </div>

        {/* Status */}
        <div className="glass-panel p-8 min-w-[300px]">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-dv-accent animate-spin" />
              <p className="text-dv-text">Completing authentication...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-dv-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-dv-success" />
              </div>
              <div>
                <p className="text-xl font-semibold text-dv-text mb-1">
                  Welcome to DocuVerse!
                </p>
                <p className="text-dv-text-muted">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-dv-error/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-dv-error" />
              </div>
              <div>
                <p className="text-xl font-semibold text-dv-text mb-1">
                  Authentication Failed
                </p>
                <p className="text-dv-text-muted">{error}</p>
              </div>
              <button
                onClick={() => router.replace('/auth/signin')}
                className="btn-primary mt-4"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
