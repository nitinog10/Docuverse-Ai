'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  FileText,
  Loader2,
  BookOpen,
  Code2,
  FolderTree,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface Documentation {
  repository: {
    name: string
    full_name: string
    description: string | null
    language: string | null
  }
  overview: {
    readme: string | null
    total_files: number
    total_lines: number
    languages: Record<string, number>
  }
  structure: any[]
  modules: Array<{
    path: string
    language: string
    functions: Array<{
      name: string
      line: number
      docstring: string | null
      parameters: string[] | null
    }>
    classes: Array<{
      name: string
      line: number
      docstring: string | null
    }>
  }>
  api: {
    functions: any[]
    classes: any[]
    total_functions: number
    total_classes: number
  }
}

export default function DocumentationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [documentation, setDocumentation] = useState<Documentation | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDocumentation()
  }, [params.id])

  const loadDocumentation = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/documentation/${params.id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDocumentation(data)
      }
    } catch (error) {
      console.log('No documentation found')
    } finally {
      setIsLoading(false)
    }
  }

  const generateDocumentation = async () => {
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/documentation/generate/${params.id}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) throw new Error('Failed to generate documentation')

      const data = await response.json()
      setDocumentation(data.documentation)
      toast.success('Documentation generated successfully!')
    } catch (error) {
      toast.error('Failed to generate documentation')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dv-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-dv-primary" />
      </div>
    )
  }

  if (!documentation) {
    return (
      <div className="min-h-screen bg-dv-bg">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-dv-text-muted hover:text-dv-text mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-dv-text-muted mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-dv-text mb-2">
              No Documentation Generated
            </h2>
            <p className="text-dv-text-secondary mb-8">
              Generate comprehensive documentation for this repository
            </p>
            <button
              onClick={generateDocumentation}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-dv-primary text-white rounded-lg hover:bg-dv-primary-hover transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Documentation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dv-bg">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-dv-text-muted hover:text-dv-text"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={generateDocumentation}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-dv-elevated text-dv-text rounded-lg hover:bg-dv-elevated-hover transition-colors text-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Regenerate
              </>
            )}
          </button>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-dv-text mb-2">
            {documentation.repository.name}
          </h1>
          <p className="text-dv-text-secondary">
            {documentation.repository.description || 'No description'}
          </p>
        </motion.div>

        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-4 mb-12"
        >
          <div className="bg-dv-elevated p-4 rounded-lg">
            <div className="text-2xl font-bold text-dv-primary mb-1">
              {documentation.overview.total_files}
            </div>
            <div className="text-sm text-dv-text-muted">Files</div>
          </div>
          <div className="bg-dv-elevated p-4 rounded-lg">
            <div className="text-2xl font-bold text-dv-success mb-1">
              {documentation.overview.total_lines.toLocaleString()}
            </div>
            <div className="text-sm text-dv-text-muted">Lines of Code</div>
          </div>
          <div className="bg-dv-elevated p-4 rounded-lg">
            <div className="text-2xl font-bold text-dv-warning mb-1">
              {documentation.api.total_functions}
            </div>
            <div className="text-sm text-dv-text-muted">Functions</div>
          </div>
          <div className="bg-dv-elevated p-4 rounded-lg">
            <div className="text-2xl font-bold text-dv-error mb-1">
              {documentation.api.total_classes}
            </div>
            <div className="text-sm text-dv-text-muted">Classes</div>
          </div>
        </motion.div>

        {/* README */}
        {documentation.overview.readme && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-dv-text mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              README
            </h2>
            <div className="bg-dv-elevated p-6 rounded-lg prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-dv-text">
                {documentation.overview.readme}
              </pre>
            </div>
          </motion.div>
        )}

        {/* API Documentation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-dv-text mb-4 flex items-center gap-2">
            <Code2 className="w-6 h-6" />
            API Reference
          </h2>

          {/* Functions */}
          {documentation.api.functions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-dv-text mb-4">Functions</h3>
              <div className="space-y-4">
                {documentation.api.functions.slice(0, 20).map((func, idx) => (
                  <div key={idx} className="bg-dv-elevated p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <code className="text-dv-primary font-mono">
                        {func.name}({func.parameters?.join(', ') || ''})
                      </code>
                      <span className="text-xs text-dv-text-muted">{func.module}</span>
                    </div>
                    {func.docstring && (
                      <p className="text-sm text-dv-text-secondary mt-2">
                        {func.docstring}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes */}
          {documentation.api.classes.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-dv-text mb-4">Classes</h3>
              <div className="space-y-4">
                {documentation.api.classes.slice(0, 20).map((cls, idx) => (
                  <div key={idx} className="bg-dv-elevated p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <code className="text-dv-success font-mono">{cls.name}</code>
                      <span className="text-xs text-dv-text-muted">{cls.module}</span>
                    </div>
                    {cls.docstring && (
                      <p className="text-sm text-dv-text-secondary mt-2">
                        {cls.docstring}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
