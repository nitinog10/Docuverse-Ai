'use client'

import { motion } from 'framer-motion'
import { 
  Play, 
  Code2, 
  Sparkles, 
  GitBranch, 
  Volume2,
  FileCode,
  Layers,
  Zap
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dv-bg overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="fixed inset-0 bg-gradient-to-br from-dv-accent/5 via-transparent to-dv-purple/5" />
      
      {/* Floating orbs */}
      <motion.div
        className="fixed top-20 left-20 w-96 h-96 bg-dv-accent/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="fixed bottom-20 right-20 w-96 h-96 bg-dv-purple/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dv-accent to-dv-purple flex items-center justify-center">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">DocuVerse</span>
        </motion.div>
        
        <motion.div 
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
          <Link href="/auth/signin" className="btn-primary flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Connect GitHub
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dv-elevated border border-dv-border mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-dv-accent" />
            <span className="text-sm text-dv-text-muted">Generative Media Documentation Engine</span>
          </motion.div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Code Walkthroughs</span>
            <br />
            <span className="text-dv-text">That Speak</span>
          </h1>

          <p className="text-xl md:text-2xl text-dv-text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
            Transform complex codebases into interactive, audio-visual experiences.
            Press <span className="text-dv-accent font-semibold">Play</span> and let an AI Senior Engineer 
            narrate your code in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/auth/signin"
              className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
            >
              <Play className="w-5 h-5" />
              Start Free
            </Link>
            <Link 
              href="/demo"
              className="btn-secondary flex items-center gap-2 text-lg px-8 py-4"
            >
              <Volume2 className="w-5 h-5" />
              Watch Demo
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 mt-32"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <FeatureCard
            icon={<Play className="w-8 h-8" />}
            title="Auto-Cast Walkthroughs"
            description="YouTube-style playback for code. Audio narration synced with auto-scrolling and syntax highlighting."
            gradient="from-dv-accent to-blue-600"
            delay={0}
          />
          <FeatureCard
            icon={<Layers className="w-8 h-8" />}
            title="Deep Code Understanding"
            description="Tree-sitter AST parsing with dependency graphs. We understand WHY code exists, not just syntax."
            gradient="from-dv-purple to-pink-600"
            delay={0.1}
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Live Sandbox"
            description="Modify variables and run code snippets instantly. Interactive learning, not passive reading."
            gradient="from-dv-success to-emerald-600"
            delay={0.2}
          />
        </motion.div>

        {/* Code Preview Section */}
        <motion.div
          className="mt-32 glass-panel glow-border p-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <FileCode className="w-6 h-6 text-dv-accent" />
            <span className="text-lg font-medium">auth_flow.py</span>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm text-dv-text-muted">
              <Volume2 className="w-4 h-4" />
              AI Narrating...
            </div>
          </div>
          
          <div className="font-mono text-sm bg-dv-bg rounded-xl p-6 overflow-hidden">
            <CodePreview />
          </div>
          
          {/* Playback controls */}
          <div className="mt-6 flex items-center gap-4">
            <button className="w-12 h-12 rounded-full bg-dv-accent flex items-center justify-center hover:bg-dv-accent-hover transition-colors">
              <Play className="w-6 h-6 text-white ml-1" />
            </button>
            <div className="flex-1 h-2 bg-dv-elevated rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-dv-accent to-dv-purple"
                initial={{ width: '0%' }}
                animate={{ width: '35%' }}
                transition={{ duration: 2, delay: 1 }}
              />
            </div>
            <span className="text-sm text-dv-text-muted">1:24 / 4:02</span>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  gradient,
  delay 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  delay: number
}) {
  return (
    <motion.div
      className="glass-panel p-6 hover:bg-dv-elevated/50 transition-colors group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + delay }}
      whileHover={{ y: -5 }}
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-dv-text-muted">{description}</p>
    </motion.div>
  )
}

function CodePreview() {
  const codeLines = [
    { num: 1, content: 'def authenticate_user(token: str) -> User:', highlighted: false },
    { num: 2, content: '    """Validate JWT token and return user."""', highlighted: true },
    { num: 3, content: '    try:', highlighted: true },
    { num: 4, content: '        payload = jwt.decode(token, SECRET_KEY)', highlighted: true },
    { num: 5, content: '        user_id = payload.get("sub")', highlighted: false },
    { num: 6, content: '        return get_user_by_id(user_id)', highlighted: false },
    { num: 7, content: '    except JWTError:', highlighted: false },
    { num: 8, content: '        raise InvalidCredentials()', highlighted: false },
  ]

  return (
    <div className="space-y-0">
      {codeLines.map((line, i) => (
        <motion.div
          key={line.num}
          className={`code-line py-1 px-2 -mx-2 ${line.highlighted ? 'highlighted' : ''}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 + i * 0.1 }}
        >
          <span className="code-line-number">{line.num}</span>
          <span className={line.highlighted ? 'text-dv-text' : 'text-dv-text-muted'}>
            {line.content}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
