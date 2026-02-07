'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Code2, ArrowRight, Loader2, Shield, Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/lib/api'
import toast from 'react-hot-toast'

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGitHubSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await auth.getGitHubAuthUrl()
      if (data.auth_url) {
        window.location.href = data.auth_url
      } else {
        throw new Error('No auth URL returned')
      }
    } catch (err) {
      console.error('Error initiating GitHub OAuth:', err)
      const msg = err instanceof Error ? err.message : 'Failed to connect to server'
      setError(msg)
      toast.error(msg)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dv-bg flex">
      {/* Ambient bg */}
      <div className="fixed inset-0 dot-grid pointer-events-none" />
      <div className="fixed top-1/3 left-1/3 w-[500px] h-[500px] bg-dv-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Left pane — branding */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-10 relative z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-dv-accent flex items-center justify-center shadow-glow-sm">
            <Code2 className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Docu<span className="text-dv-accent">Verse</span>
          </span>
        </Link>

        <div className="max-w-sm">
          <h1 className="text-display-sm mb-4">
            Understand any codebase <span className="gradient-text">in minutes</span>
          </h1>
          <p className="text-dv-text-secondary leading-relaxed">
            Connect your repository and get AI-narrated walkthroughs with voice, diagrams, and a live sandbox.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-dv-text-muted">
          <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> End-to-end secure</span>
          <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> OAuth 2.0</span>
        </div>
      </div>

      {/* Right pane — sign-in card */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-dv-accent flex items-center justify-center">
                <Code2 className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold">Docu<span className="text-dv-accent">Verse</span></span>
            </Link>
          </div>

          <div className="glass-panel-solid p-8">
            <h2 className="text-xl font-semibold mb-1">Welcome back</h2>
            <p className="text-sm text-dv-text-muted mb-8">Sign in to continue to DocuVerse</p>

            <button
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl
                       bg-white text-zinc-900 font-medium text-sm
                       hover:bg-zinc-100 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              )}
              <span>{isLoading ? 'Connecting...' : 'Continue with GitHub'}</span>
            </button>

            {error && (
              <p className="mt-3 text-xs text-dv-error text-center">{error}</p>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dv-border/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-dv-surface text-xs text-dv-text-muted">or</span>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl
                       bg-dv-elevated border border-dv-border/60 text-sm font-medium
                       hover:bg-dv-surface hover:border-dv-border transition-colors group"
            >
              <Sparkles className="w-4 h-4 text-dv-accent" />
              Explore Demo
              <ArrowRight className="w-3.5 h-3.5 text-dv-text-muted group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <p className="text-center text-xs text-dv-text-muted mt-6 leading-relaxed">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-dv-accent hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-dv-accent hover:underline">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

