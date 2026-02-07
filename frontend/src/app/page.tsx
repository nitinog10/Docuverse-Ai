'use client'

import { motion } from 'framer-motion'
import {
  Play,
  Code2,
  ArrowRight,
  GitBranch,
  Volume2,
  FileCode,
  Layers,
  Zap,
  Sparkles,
  BarChart3,
  Shield,
} from 'lucide-react'
import Link from 'next/link'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dv-bg overflow-hidden relative">
      {/* Ambient background */}
      <div className="fixed inset-0 dot-grid pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-dv-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[500px] bg-dv-purple/[0.04] rounded-full blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between max-w-7xl mx-auto px-6 lg:px-8 h-16">
        <motion.div
          className="flex items-center gap-2.5"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-8 h-8 rounded-lg bg-dv-accent flex items-center justify-center shadow-glow-sm">
            <Code2 className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Docu<span className="text-dv-accent">Verse</span>
          </span>
        </motion.div>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/auth/signin" className="btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/auth/signin" className="btn-primary flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <main className="relative z-10">
        <motion.section
          className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-20 text-center"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dv-elevated/80 border border-dv-border/40 text-xs font-medium text-dv-text-secondary">
              <Sparkles className="w-3.5 h-3.5 text-dv-accent" />
              AI-Powered Code Documentation
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-display-lg md:text-display-xl max-w-4xl mx-auto mb-6"
          >
            <span className="text-dv-text">Your code, </span>
            <span className="gradient-text">explained</span>
            <br />
            <span className="text-dv-text">out loud</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-body-lg text-dv-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Connect a repository and let an AI senior engineer narrate your code.
            Interactive walkthroughs with audio, diagrams, and a live sandbox — generated in seconds.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/signin"
              className="btn-primary flex items-center gap-2 px-7 py-3 text-base"
            >
              <Play className="w-4 h-4" />
              Start for free
            </Link>
            <Link
              href="/dashboard"
              className="btn-secondary flex items-center gap-2 px-7 py-3 text-base"
            >
              Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.section>

        {/* Code preview card */}
        <motion.section
          className="max-w-5xl mx-auto px-6 lg:px-8 pb-28"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          <div className="glass-panel overflow-hidden shadow-elevated">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-dv-border/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-dv-error/60" />
                <div className="w-3 h-3 rounded-full bg-dv-warning/60" />
                <div className="w-3 h-3 rounded-full bg-dv-success/60" />
              </div>
              <div className="flex items-center gap-2 text-sm text-dv-text-muted">
                <FileCode className="w-3.5 h-3.5" />
                auth_service.py
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2 badge-accent">
                <Volume2 className="w-3 h-3" />
                AI Narrating
              </div>
            </div>

            {/* Code */}
            <div className="font-mono text-sm p-5 bg-dv-bg/50">
              <CodePreview />
            </div>

            {/* Player bar */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-dv-border/30 bg-dv-surface/50">
              <button className="w-9 h-9 rounded-full bg-dv-accent flex items-center justify-center hover:bg-dv-accent-hover transition-colors shadow-glow-sm">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </button>
              <div className="flex-1 h-1.5 bg-dv-elevated rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-dv-accent rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '38%' }}
                  transition={{ duration: 2.5, delay: 1 }}
                />
              </div>
              <span className="text-xs text-dv-text-muted font-mono tabular-nums">1:24 / 4:02</span>
            </div>
          </div>
        </motion.section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-32">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-display-sm mb-3">How it works</h2>
            <p className="text-dv-text-secondary text-body-lg max-w-xl mx-auto">
              Three steps from repository to narrated walkthrough
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-5"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              {
                icon: <GitBranch className="w-5 h-5" />,
                step: '01',
                title: 'Connect',
                desc: 'Link your GitHub repository. We clone and parse the full codebase using tree-sitter AST analysis.',
                color: 'bg-dv-accent/10 text-dv-accent',
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                step: '02',
                title: 'Generate',
                desc: 'GPT-4o writes a structured walkthrough script with audio narration synced to each code section.',
                color: 'bg-dv-purple/10 text-dv-purple',
              },
              {
                icon: <Play className="w-5 h-5" />,
                step: '03',
                title: 'Play',
                desc: 'Watch the walkthrough with auto-scrolling code, voice narration, Mermaid diagrams, and a live sandbox.',
                color: 'bg-dv-success/10 text-dv-success',
              },
            ].map((f) => (
              <motion.div key={f.step} variants={fadeUp} className="card-hover group">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center`}>
                    {f.icon}
                  </div>
                  <span className="text-xs font-mono text-dv-text-muted">{f.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-dv-text-secondary leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Capability strip */}
        <section className="border-t border-dv-border/30 py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {[
                { icon: <Volume2 className="w-4 h-4" />, label: 'Voice Narration', sub: 'Browser TTS' },
                { icon: <Layers className="w-4 h-4" />, label: 'Mermaid Diagrams', sub: 'Auto-generated' },
                { icon: <Zap className="w-4 h-4" />, label: 'Live Sandbox', sub: 'Run code instantly' },
                { icon: <Shield className="w-4 h-4" />, label: 'Private Repos', sub: 'GitHub OAuth' },
              ].map((c) => (
                <motion.div
                  key={c.label}
                  variants={fadeUp}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dv-surface/50 border border-dv-border/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-dv-elevated flex items-center justify-center text-dv-text-secondary">
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-dv-text-muted">{c.sub}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-dv-border/30 py-20">
          <motion.div
            className="max-w-2xl mx-auto text-center px-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-display-sm mb-4">Ready to understand your code?</h2>
            <p className="text-dv-text-secondary mb-8">Connect a repo and generate your first walkthrough in under a minute.</p>
            <Link href="/auth/signin" className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-dv-border/30 py-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between text-xs text-dv-text-muted">
            <span>© 2025 DocuVerse</span>
            <span className="flex items-center gap-1">
              Built with <Sparkles className="w-3 h-3 text-dv-accent" /> by DocuSense AI
            </span>
          </div>
        </footer>
      </main>
    </div>
  )
}

function CodePreview() {
  const lines = [
    { n: 1, code: 'class AuthService:', hl: false },
    { n: 2, code: '    """Handle JWT-based authentication."""', hl: false },
    { n: 3, code: '', hl: false },
    { n: 4, code: '    async def verify_token(self, token: str) -> User:', hl: true },
    { n: 5, code: '        payload = jwt.decode(token, self.secret)', hl: true },
    { n: 6, code: '        user_id = payload.get("sub")', hl: true },
    { n: 7, code: '        if not user_id:', hl: false },
    { n: 8, code: '            raise InvalidCredentials("Missing subject")', hl: false },
    { n: 9, code: '        return await self.repo.get(user_id)', hl: false },
  ]

  return (
    <div>
      {lines.map((l, i) => (
        <motion.div
          key={l.n}
          className={`code-line py-0.5 px-2 -mx-2 rounded-sm ${l.hl ? 'highlighted' : ''}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 + i * 0.07 }}
        >
          <span className="code-line-number">{l.n}</span>
          <span className={l.hl ? 'text-dv-text' : 'text-dv-text-secondary'}>{l.code}</span>
        </motion.div>
      ))}
    </div>
  )
}
