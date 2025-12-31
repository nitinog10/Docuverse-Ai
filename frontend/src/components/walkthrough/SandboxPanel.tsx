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

interface Variable {
  name: string
  value: string
  type: string
}

export function SandboxPanel() {
  const [code, setCode] = useState(`# Try modifying the authentication logic
email = "user@example.com"
password = "secret123"

# Test password hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])

hashed = pwd_context.hash(password)
print(f"Hashed password: {hashed[:50]}...")

# Verify password
is_valid = pwd_context.verify(password, hashed)
print(f"Password valid: {is_valid}")
`)

  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [variables, setVariables] = useState<Variable[]>([
    { name: 'email', value: 'user@example.com', type: 'string' },
    { name: 'password', value: 'secret123', type: 'string' },
    { name: 'ACCESS_TOKEN_EXPIRE_MINUTES', value: '30', type: 'number' },
  ])

  const handleRun = async () => {
    setIsRunning(true)
    setError(null)
    setOutput('')

    // Simulate execution
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock output
    const mockOutput = `Hashed password: $2b$12$LQv3c1yqBWVHxkd0LHAkC...
Password valid: True

Execution time: 124ms`

    setOutput(mockOutput)
    setIsRunning(false)
  }

  const handleReset = () => {
    setCode(`# Try modifying the authentication logic
email = "user@example.com"
password = "secret123"

# Test password hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])

hashed = pwd_context.hash(password)
print(f"Hashed password: {hashed[:50]}...")

# Verify password
is_valid = pwd_context.verify(password, hashed)
print(f"Password valid: {is_valid}")
`)
    setOutput('')
    setError(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dv-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4 text-dv-success" />
            Live Sandbox
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
              disabled={isRunning}
            >
              <RotateCcw className="w-4 h-4 text-dv-text-muted" />
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dv-success/10 text-dv-success hover:bg-dv-success/20 transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-medium">Run</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Variables */}
        <div className="space-y-2">
          <p className="text-xs text-dv-text-muted font-medium">Variables</p>
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => (
              <div
                key={variable.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dv-bg border border-dv-border"
              >
                <span className="text-xs text-dv-purple">{variable.name}</span>
                <span className="text-xs text-dv-text-muted">=</span>
                <input
                  type="text"
                  value={variable.value}
                  onChange={(e) => {
                    setVariables((vars) =>
                      vars.map((v) =>
                        v.name === variable.name
                          ? { ...v, value: e.target.value }
                          : v
                      )
                    )
                  }}
                  className="w-24 text-xs bg-transparent text-dv-text focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Code editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-dv-border bg-dv-bg">
          <Code2 className="w-4 h-4 text-dv-text-muted" />
          <span className="text-xs text-dv-text-muted">sandbox.py</span>
        </div>
        <div className="flex-1 overflow-auto">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full p-4 bg-dv-bg font-mono text-sm text-dv-text resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Output */}
      <div className="border-t border-dv-border">
        <div className="flex items-center gap-2 px-4 py-2 bg-dv-bg border-b border-dv-border">
          <Terminal className="w-4 h-4 text-dv-text-muted" />
          <span className="text-xs text-dv-text-muted">Output</span>
          {output && !error && (
            <CheckCircle2 className="w-4 h-4 text-dv-success ml-auto" />
          )}
          {error && (
            <AlertCircle className="w-4 h-4 text-dv-error ml-auto" />
          )}
        </div>
        <div className="h-32 overflow-auto p-4 bg-dv-bg font-mono text-sm">
          {isRunning && (
            <motion.div
              className="flex items-center gap-2 text-dv-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing code...</span>
            </motion.div>
          )}
          {error && (
            <div className="text-dv-error">{error}</div>
          )}
          {output && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-dv-text whitespace-pre-wrap"
            >
              {output}
            </motion.div>
          )}
          {!isRunning && !output && !error && (
            <span className="text-dv-text-muted">
              Click "Run" to execute the code
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

