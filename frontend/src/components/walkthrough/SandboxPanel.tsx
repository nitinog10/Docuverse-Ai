'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  RotateCcw,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Code2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { sandbox } from '@/lib/api'
import toast from 'react-hot-toast'

const DEFAULT_CODE = `# Try running some Python code
print("Hello from the sandbox!")

# Example: list comprehension
squares = [x**2 for x in range(10)]
print(f"Squares: {squares}")
`

export function SandboxPanel() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    setError(null)
    setOutput('')
    setExecutionTime(null)

    try {
      const result = await sandbox.execute(code, 'python')
      if (result.success) {
        setOutput(result.output)
      } else {
        setError(result.error || 'Execution failed')
      }
      setExecutionTime(result.execution_time)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code')
    } finally {
      setIsRunning(false)
    }
  }

  const handleReset = () => {
    setCode(DEFAULT_CODE)
    setOutput('')
    setError(null)
    setExecutionTime(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dv-border/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4 text-dv-success" />
            Sandbox
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-dv-elevated transition-colors"
              disabled={isRunning}
            >
              <RotateCcw className="w-3.5 h-3.5 text-dv-text-muted" />
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dv-success/10 text-dv-success hover:bg-dv-success/20 transition-colors disabled:opacity-50 text-xs font-medium"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Code editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-dv-border/20 bg-dv-bg/50">
          <Code2 className="w-3.5 h-3.5 text-dv-text-muted" />
          <span className="text-[10px] text-dv-text-muted">sandbox.py</span>
        </div>
        <div className="flex-1 overflow-auto">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full p-4 bg-dv-bg font-mono text-xs text-dv-text resize-none focus:outline-none leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Output */}
      <div className="border-t border-dv-border/30">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-dv-bg/50 border-b border-dv-border/20">
          <Terminal className="w-3.5 h-3.5 text-dv-text-muted" />
          <span className="text-[10px] text-dv-text-muted">Output</span>
          {executionTime !== null && (
            <span className="text-[10px] text-dv-text-muted ml-auto">{executionTime.toFixed(0)}ms</span>
          )}
          {output && !error && (
            <CheckCircle2 className="w-3.5 h-3.5 text-dv-success ml-auto" />
          )}
          {error && (
            <AlertCircle className="w-3.5 h-3.5 text-dv-error ml-auto" />
          )}
        </div>
        <div className="h-28 overflow-auto p-4 bg-dv-bg font-mono text-xs">
          {isRunning && (
            <motion.div
              className="flex items-center gap-2 text-dv-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing…</span>
            </motion.div>
          )}
          {error && <div className="text-dv-error">{error}</div>}
          {output && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-dv-text whitespace-pre-wrap"
            >
              {output}
            </motion.div>
          )}
          {!isRunning && !output && !error && (
            <span className="text-dv-text-muted">Click "Run" to execute</span>
          )}
        </div>
      </div>
    </div>
  )
}

