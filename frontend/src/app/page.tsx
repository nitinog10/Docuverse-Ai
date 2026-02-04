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
    <div className="min-h-screen bg-dv-bg overflow-hidden relative">
      {/* Premium background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-15" />
      <div className="fixed inset-0 bg-gradient-to-br from-dv-accent/8 via-transparent to-dv-teal/8" />
      
      {/* Animated gradient orbs - enhanced premium effect */}
      <motion.div
        className="fixed top-10 left-10 w-[500px] h-[500px] bg-gradient-to-br from-dv-accent to-dv-accent-dark rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-dv-teal to-dv-accent rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.12, 0.2, 0.12],
          x: [0, -50, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
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
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-40">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge with enhanced animation */}
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-dv-accent/10 border border-dv-accent/30 mb-8 backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-dv-accent" />
            </motion.div>
            <span className="text-sm font-medium text-dv-accent">Generative Media Documentation Engine</span>
          </motion.div>

          {/* Main heading with staggered animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
              <motion.span 
                className="gradient-text inline-block"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                Code Walkthroughs
              </motion.span>
              <br />
              <motion.span 
                className="text-dv-text inline-block"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                That Speak
              </motion.span>
            </h1>
          </motion.div>

          {/* Description with fade-in */}
          <motion.p 
            className="text-lg md:text-xl text-dv-text-muted max-w-3xl mx-auto mb-16 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            Transform complex codebases into interactive, audio-visual experiences.
            Press <motion.span 
              className="text-dv-accent font-semibold"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Play
            </motion.span> and let an AI Senior Engineer narrate your code in real-time.
          </motion.p>

          {/* CTA Buttons with staggered animation */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href="/auth/signin"
                className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
              >
                <Play className="w-5 h-5" />
                Start Free
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href="/demo"
                className="btn-secondary flex items-center gap-2 text-lg px-8 py-4"
              >
                <Volume2 className="w-5 h-5" />
                Watch Demo
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Feature Cards - Premium Grid */}
        <motion.div
          className="grid md:grid-cols-3 gap-8 mt-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
        >
          <FeatureCard
            icon={<Play className="w-8 h-8" />}
            title="Auto-Cast Walkthroughs"
            description="YouTube-style playback for code. Audio narration synced with auto-scrolling and syntax highlighting."
            gradient="from-dv-accent to-dv-accent-dark"
            delay={1.5}
          />
          <FeatureCard
            icon={<Layers className="w-8 h-8" />}
            title="Deep Code Understanding"
            description="Tree-sitter AST parsing with dependency graphs. We understand WHY code exists, not just syntax."
            gradient="from-dv-teal to-dv-emerald"
            delay={1.7}
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Live Sandbox"
            description="Modify variables and run code snippets instantly. Interactive learning, not passive reading."
            gradient="from-dv-indigo to-dv-accent"
            delay={1.9}
          />
        </motion.div>

        {/* Code Preview Section - Premium showcase */}
        <motion.div
          className="mt-40 glass-panel glow-border p-10"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 2, duration: 0.8, ease: "easeOut" }}
          whileHover={{ scale: 1.02 }}
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
      className="glass-panel-elevated p-8 group cursor-pointer relative overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: "easeOut" }}
      whileHover={{ y: -10, scale: 1.02 }}
    >
      {/* Background glow on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-dv-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        initial={false}
      />
      
      <div className="relative z-10">
        <motion.div 
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-6 shadow-lg`}
          whileHover={{ scale: 1.15, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-semibold mb-3 text-dv-text">{title}</h3>
        <p className="text-dv-text-muted leading-relaxed text-sm">{description}</p>
      </div>
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
