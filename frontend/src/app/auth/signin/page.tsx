'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Code2, ArrowRight, Loader2, Shield, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGitHubSignIn = async () => {
    setIsLoading(true)
    
    try {
      // In production, this would call the backend to get the OAuth URL
      const response = await fetch('/api/backend/auth/github')
      const data = await response.json()
      
      if (data.auth_url) {
        window.location.href = data.auth_url
      }
    } catch (error) {
      console.error('Error initiating GitHub OAuth:', error)
      // For demo, redirect to dashboard
      window.location.href = '/dashboard'
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-dv-bg flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="fixed inset-0 bg-gradient-to-br from-dv-accent/5 via-transparent to-dv-purple/5" />
      
      {/* Floating orbs */}
      <motion.div
        className="fixed top-1/4 left-1/4 w-64 h-64 bg-dv-accent/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-dv-purple/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dv-accent to-dv-purple flex items-center justify-center">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold gradient-text">DocuVerse</span>
          </Link>
          <p className="text-dv-text-muted">
            Sign in to start creating code walkthroughs
          </p>
        </div>

        {/* Sign in card */}
        <div className="glass-panel p-8">
          <button
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl
                     bg-white text-gray-900 font-medium
                     hover:bg-gray-100 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GitBranch className="w-5 h-5" />
            )}
            <span>{isLoading ? 'Connecting...' : 'Continue with GitHub'}</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dv-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dv-surface text-dv-text-muted">or</span>
            </div>
          </div>

          {/* Demo access */}
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl
                     bg-dv-elevated border border-dv-border text-dv-text font-medium
                     hover:bg-dv-surface transition-colors group"
          >
            <Sparkles className="w-5 h-5 text-dv-accent" />
            <span>Try Demo</span>
            <ArrowRight className="w-4 h-4 text-dv-text-muted group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <FeatureBadge icon={<Shield className="w-4 h-4" />} label="Secure OAuth" />
          <FeatureBadge icon={<GitBranch className="w-4 h-4" />} label="Repo Access" />
          <FeatureBadge icon={<Sparkles className="w-4 h-4" />} label="AI Powered" />
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-dv-text-muted mt-8">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-dv-accent hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-dv-accent hover:underline">
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-dv-surface/50">
      <div className="text-dv-accent">{icon}</div>
      <span className="text-xs text-dv-text-muted">{label}</span>
    </div>
  )
}

