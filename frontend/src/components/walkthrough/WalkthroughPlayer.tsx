'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  MessageSquare,
  Clock,
} from 'lucide-react'
import { clsx } from 'clsx'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScriptSegment {
  id: string
  order: number
  text: string
  startLine: number
  endLine: number
  highlightLines: number[]
  durationEstimate: number
  codeContext?: string
}

interface WalkthroughScript {
  id: string
  filePath: string
  title: string
  summary: string
  totalDuration: number
  segments: ScriptSegment[]
}

/** Mirrors backend AudioSegment – handles both camelCase and snake_case. */
interface AudioSegmentTiming {
  startTime: number
  endTime: number
}

interface WalkthroughPlayerProps {
  code: string
  script: WalkthroughScript
  filePath: string
  isPlaying: boolean
  onPlayingChange: (playing: boolean) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

/** Normalise an audio‐segment object coming from the API (snake or camel). */
function normaliseSegmentTiming(raw: any): AudioSegmentTiming {
  return {
    startTime: raw.startTime ?? raw.start_time ?? 0,
    endTime: raw.endTime ?? raw.end_time ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WalkthroughPlayer({
  code,
  script,
  filePath,
  isPlaying,
  onPlayingChange,
}: WalkthroughPlayerProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [segmentProgress, setSegmentProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showTranscript, setShowTranscript] = useState(true)

  // Audio pipeline state
  const [audioReady, setAudioReady] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)  // don't block UI
  const [audioError, setAudioError] = useState<string | null>(null)
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null)
  const [segmentTimings, setSegmentTimings] = useState<AudioSegmentTiming[]>([])
  const [displayTime, setDisplayTime] = useState(0)

  // Start with browser TTS immediately – upgrade to real audio when ready
  const [useBrowserTTS, setUseBrowserTTS] = useState(true)

  // ── Refs ────────────────────────────────────────────────────────────────
  const codeContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const currentSegmentIndexRef = useRef(currentSegmentIndex)
  const onPlayingChangeRef = useRef(onPlayingChange)

  useEffect(() => { currentSegmentIndexRef.current = currentSegmentIndex }, [currentSegmentIndex])
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange }, [onPlayingChange])

  // ── Derived ─────────────────────────────────────────────────────────────
  const safeIndex = Math.min(currentSegmentIndex, Math.max(script.segments.length - 1, 0))
  const currentSegment = script.segments.length > 0 ? script.segments[safeIndex] : undefined
  const lines = code.split('\n')

  // ── Background poll for server-generated audio ──────────────────────────
  // Browser TTS is used immediately; this upgrades to real audio when ready.
  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let pollInterval = 3000 // start at 3s
    let pollCount = 0
    const MAX_POLLS = 20 // ~60s total

    const fetchAudio = async () => {
      const token = getAuthToken()
      if (!token) return // browser TTS already active

      try {
        // 1. Check if the backend has finished generating audio
        const metaRes = await fetch(
          `${API_BASE_URL}/walkthroughs/${script.id}/audio`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (metaRes.status === 202) {
          pollCount++
          if (pollCount >= MAX_POLLS) {
            console.info('Audio generation timed out, staying with browser TTS')
            return
          }
          // Audio still generating – poll again with backoff (max 6s)
          pollInterval = Math.min(pollInterval + 500, 6000)
          if (!cancelled) pollTimer = setTimeout(fetchAudio, pollInterval)
          return
        }
        if (!metaRes.ok) return // stay with browser TTS

        const meta = await metaRes.json()
        if (cancelled) return

        // Normalise timings (handles both snake_case and camelCase)
        const timings: AudioSegmentTiming[] = (
          meta.audioSegments ?? meta.audio_segments ?? []
        ).map(normaliseSegmentTiming)

        // 2. Fetch the actual audio stream as a blob
        const streamRes = await fetch(
          `${API_BASE_URL}/walkthroughs/${script.id}/audio/stream`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!streamRes.ok) return // stay with browser TTS

        // Verify response is actually audio
        const contentType = streamRes.headers.get('content-type') || ''
        if (!contentType.includes('audio')) return

        const blob = await streamRes.blob()
        if (cancelled) return

        // Guard: if the blob is empty or too small, it's not valid audio
        if (!blob || blob.size < 100) return

        // Audio is ready — upgrade from browser TTS
        const url = URL.createObjectURL(blob)
        setSegmentTimings(timings)
        setAudioBlobUrl(url)
        setAudioReady(true)
        setUseBrowserTTS(false)
        setAudioLoading(false)
        // Stop browser TTS if playing
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        console.info('🔊 Upgraded to server-generated audio')
      } catch {
        // Silently stay with browser TTS
      }
    }

    // Start polling after a short delay (give backend time to start generating)
    pollTimer = setTimeout(fetchAudio, 3000)
    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [script.id])

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => { if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl) }
  }, [audioBlobUrl])

  // ── Browser TTS fallback initialisation ─────────────────────────────────
  useEffect(() => {
    if (!useBrowserTTS) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    speechSynthRef.current = new SpeechSynthesisUtterance()
    speechSynthRef.current.rate = playbackSpeed
    speechSynthRef.current.volume = isMuted ? 0 : 1

    speechSynthRef.current.onend = () => {
      const idx = currentSegmentIndexRef.current
      if (idx < script.segments.length - 1) {
        setCurrentSegmentIndex((prev) => Math.min(prev + 1, script.segments.length - 1))
        setSegmentProgress(0)
      } else {
        onPlayingChangeRef.current(false)
        setSegmentProgress(100)
      }
    }

    return () => { window.speechSynthesis.cancel() }
  }, [useBrowserTTS])

  // ── Sync audio element ↔ play state ─────────────────────────────────────
  useEffect(() => {
    // ElevenLabs path
    if (audioReady && audioRef.current && !useBrowserTTS) {
      if (isPlaying) audioRef.current.play().catch(console.error)
      else audioRef.current.pause()
      return
    }

    // Browser TTS fallback path
    if (useBrowserTTS && currentSegment) {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      if (isPlaying) {
        window.speechSynthesis.cancel()
        if (speechSynthRef.current) {
          speechSynthRef.current.text = currentSegment.text
          speechSynthRef.current.rate = playbackSpeed
          speechSynthRef.current.volume = isMuted ? 0 : 1
          window.speechSynthesis.speak(speechSynthRef.current)
        }
      } else {
        window.speechSynthesis.cancel()
      }
    }
  }, [isPlaying, audioReady, useBrowserTTS, currentSegmentIndex, currentSegment, playbackSpeed, isMuted])

  // ── Sync playback speed / mute with <audio> ────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed
    if (speechSynthRef.current) speechSynthRef.current.rate = playbackSpeed
  }, [playbackSpeed])

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted
    if (speechSynthRef.current) speechSynthRef.current.volume = isMuted ? 0 : 1
  }, [isMuted])

  // ── Audio timeupdate → segment sync ─────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio || segmentTimings.length === 0) return

    const t = audio.currentTime
    setDisplayTime(t)

    for (let i = 0; i < segmentTimings.length; i++) {
      const seg = segmentTimings[i]
      if (t >= seg.startTime && t < seg.endTime) {
        setCurrentSegmentIndex(i)
        const dur = seg.endTime - seg.startTime
        setSegmentProgress(dur > 0 ? ((t - seg.startTime) / dur) * 100 : 0)
        return
      }
    }

    // Past all segments
    const last = segmentTimings[segmentTimings.length - 1]
    if (last && t >= last.endTime) {
      setCurrentSegmentIndex(segmentTimings.length - 1)
      setSegmentProgress(100)
    }
  }, [segmentTimings])

  const handleAudioEnded = useCallback(() => {
    onPlayingChange(false)
    setSegmentProgress(100)
  }, [onPlayingChange])

  /** If the <audio> element fails to load/play, fall back to browser TTS. */
  const handleAudioError = useCallback(() => {
    console.warn('Audio element playback error – switching to browser TTS')
    setAudioReady(false)
    setAudioError('Audio playback failed')
    setUseBrowserTTS(true)
    // Revoke the broken blob URL so it doesn't retry
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl)
      setAudioBlobUrl(null)
    }
  }, [audioBlobUrl])

  // ── Browser TTS progress timer (fallback only) ─────────────────────────
  useEffect(() => {
    if (!useBrowserTTS || !isPlaying || !currentSegment) return

    const duration = (currentSegment.durationEstimate * 1000) / playbackSpeed
    const interval = duration / 100
    const timer = setInterval(() => {
      setSegmentProgress((prev) => (prev >= 100 ? 100 : prev + 1))
    }, interval)

    return () => clearInterval(timer)
  }, [useBrowserTTS, isPlaying, currentSegmentIndex, playbackSpeed, currentSegment])

  // ── Progress / time computation ─────────────────────────────────────────
  const audioDuration = audioRef.current?.duration || script.totalDuration

  const totalProgress = (() => {
    if (audioReady && audioRef.current && audioRef.current.duration) {
      return (displayTime / audioRef.current.duration) * 100
    }
    // Fallback estimate
    if (!currentSegment || !script.segments.length) return 0
    const completedDuration = script.segments
      .slice(0, currentSegmentIndex)
      .reduce((sum, seg) => sum + seg.durationEstimate, 0)
    const currentDuration = currentSegment.durationEstimate * (segmentProgress / 100)
    return script.totalDuration > 0
      ? ((completedDuration + currentDuration) / script.totalDuration) * 100
      : 0
  })()

  // ── Auto-scroll code viewer ─────────────────────────────────────────────
  useEffect(() => {
    if (codeContainerRef.current && currentSegment) {
      const targetLine = currentSegment.startLine
      const lineHeight = 28
      const scrollTarget = (targetLine - 5) * lineHeight
      codeContainerRef.current.scrollTo({
        top: Math.max(0, scrollTarget),
        behavior: 'smooth',
      })
    }
  }, [currentSegment])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSkipBack = () => {
    if (useBrowserTTS && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (currentSegmentIndex > 0) {
      const prevIdx = currentSegmentIndex - 1
      if (audioReady && audioRef.current && segmentTimings[prevIdx]) {
        audioRef.current.currentTime = segmentTimings[prevIdx].startTime
      }
      setCurrentSegmentIndex(prevIdx)
      setSegmentProgress(0)
    }
  }

  const handleSkipForward = () => {
    if (useBrowserTTS && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (currentSegmentIndex < script.segments.length - 1) {
      const nextIdx = currentSegmentIndex + 1
      if (audioReady && audioRef.current && segmentTimings[nextIdx]) {
        audioRef.current.currentTime = segmentTimings[nextIdx].startTime
      }
      setCurrentSegmentIndex(nextIdx)
      setSegmentProgress(0)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (useBrowserTTS && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width

    if (audioReady && audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = percentage * audioRef.current.duration
      return
    }

    // Fallback: estimate segment from percentage
    let accumulatedDuration = 0
    for (let i = 0; i < script.segments.length; i++) {
      const segPct = (script.segments[i].durationEstimate / script.totalDuration) * 100
      if ((accumulatedDuration + segPct) >= percentage * 100) {
        setCurrentSegmentIndex(i)
        const within = ((percentage * 100 - accumulatedDuration) / segPct) * 100
        setSegmentProgress(Math.max(0, Math.min(100, within)))
        break
      }
      accumulatedDuration += segPct
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentTime = (() => {
    if (audioReady && displayTime > 0) return displayTime
    if (!currentSegment || !script.segments.length) return 0
    const completed = script.segments
      .slice(0, currentSegmentIndex)
      .reduce((sum, seg) => sum + seg.durationEstimate, 0)
    return completed + (currentSegment.durationEstimate * (segmentProgress / 100))
  })()

  return (
    <div className="h-full flex flex-col">
      {/* Hidden <audio> element – drives ElevenLabs playback */}
      {audioBlobUrl && (
        <audio
          ref={audioRef}
          src={audioBlobUrl}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
        />
      )}

      {/* Audio status – show subtle indicator when upgrade is available */}
      {audioReady && !useBrowserTTS && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border-b border-dv-border text-xs text-green-400">
          🔊 AI voice active
        </div>
      )}

      {/* Code viewer */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto bg-dv-bg p-6 font-mono text-sm"
      >
        {lines.map((line, index) => {
          const lineNumber = index + 1
          const highlightLines = currentSegment?.highlightLines ?? []
          const isHighlighted = highlightLines.includes(lineNumber)
          const isInRange = currentSegment ? (lineNumber >= currentSegment.startLine && lineNumber <= currentSegment.endLine) : false

          return (
            <motion.div
              key={index}
              className={clsx(
                'flex py-0.5 px-2 -mx-2 rounded transition-colors duration-300',
                isHighlighted && 'bg-dv-accent/15 border-l-2 border-dv-accent',
                isInRange && !isHighlighted && 'bg-dv-accent/5'
              )}
              initial={false}
              animate={{
                backgroundColor: isHighlighted 
                  ? 'rgba(99, 102, 241, 0.15)' 
                  : isInRange 
                    ? 'rgba(99, 102, 241, 0.05)' 
                    : 'transparent',
              }}
            >
              <span className="w-12 text-right pr-4 text-dv-text-muted select-none flex-shrink-0">
                {lineNumber}
              </span>
              <span className={clsx(
                'flex-1 whitespace-pre',
                isHighlighted ? 'text-dv-text' : 'text-dv-text-muted'
              )}>
                <SyntaxHighlight code={line} />
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Transcript overlay */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            className="absolute bottom-32 left-1/2 -translate-x-1/2 max-w-2xl w-full px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="glass-panel p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-dv-accent/20 flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-4 h-4 text-dv-accent" />
                </div>
                <div>
                  <p className="text-sm text-dv-text-muted mb-1">
                    Segment {currentSegmentIndex + 1} of {script.segments.length}
                  </p>
                  <p className="text-dv-text leading-relaxed">{currentSegment?.text ?? ''}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="border-t border-dv-border bg-dv-surface p-4">
        {/* Progress bar */}
        <div 
          className="h-2 bg-dv-elevated rounded-full mb-4 cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-dv-accent to-dv-purple rounded-full relative"
            initial={false}
            animate={{ width: `${totalProgress}%` }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform translate-x-1/2" />
          </motion.div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSkipBack}
                className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
                disabled={currentSegmentIndex === 0}
              >
                <SkipBack className="w-5 h-5 text-dv-text-muted" />
              </button>
              
              <button
                onClick={() => onPlayingChange(!isPlaying)}
                className="w-14 h-14 rounded-full bg-dv-accent flex items-center justify-center hover:bg-dv-accent-hover transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-1" />
                )}
              </button>
              
              <button
                onClick={handleSkipForward}
                className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
                disabled={currentSegmentIndex === script.segments.length - 1}
              >
                <SkipForward className="w-5 h-5 text-dv-text-muted" />
              </button>
            </div>

            {/* Time display */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-dv-text">{formatTime(currentTime)}</span>
              <span className="text-dv-text-muted">/</span>
              <span className="text-dv-text-muted">{formatTime(audioDuration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Volume */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-dv-text-muted" />
              ) : (
                <Volume2 className="w-5 h-5 text-dv-text-muted" />
              )}
            </button>

            {/* Transcript toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                showTranscript ? 'bg-dv-accent/10 text-dv-accent' : 'hover:bg-dv-elevated text-dv-text-muted'
              )}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Playback speed */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-dv-elevated transition-colors">
                <Clock className="w-4 h-4 text-dv-text-muted" />
                <span className="text-sm text-dv-text-muted">{playbackSpeed}x</span>
              </button>
              
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                <div className="glass-panel p-2 flex flex-col gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={clsx(
                        'px-3 py-1.5 rounded text-sm transition-colors',
                        playbackSpeed === speed
                          ? 'bg-dv-accent/10 text-dv-accent'
                          : 'hover:bg-dv-elevated text-dv-text-muted'
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple syntax highlighting component using tokenization (no dangerouslySetInnerHTML)
function SyntaxHighlight({ code }: { code: string }) {
  // Single combined regex — alternation ensures each character is matched only once,
  // preventing earlier matches from being re-processed by later patterns.
  const tokenRegex =
    /(#.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:def|class|return|if|else|elif|for|while|try|except|import|from|async|await|with|as|None|True|False|const|let|var|function|export|default|interface|type|enum|extends|implements|new|this|super|throw|catch|finally|switch|case|break|continue|yield|of|in|instanceof|typeof|void|delete|null|undefined|true|false)\b)|(\b\d+\.?\d*\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b\w+(?=\s*\())/gm

  const tokens: { text: string; className?: string }[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(code)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) })
    }

    let className: string | undefined
    if (match[1]) className = 'text-dv-text-muted'   // Comments
    else if (match[2]) className = 'text-dv-success'  // Strings
    else if (match[3]) className = 'text-dv-purple'   // Keywords
    else if (match[4]) className = 'text-dv-warning'  // Numbers
    else if (match[5]) className = 'text-dv-cyan'     // PascalCase / Classes
    else if (match[6]) className = 'text-dv-accent'   // Function calls

    tokens.push({ text: match[0], className })
    lastIndex = match.index + match[0].length
  }

  // Remaining plain text
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) })
  }

  return (
    <>
      {tokens.map((tok, i) =>
        tok.className
          ? <span key={i} className={tok.className}>{tok.text}</span>
          : <span key={i}>{tok.text}</span>
      )}
    </>
  )
}

