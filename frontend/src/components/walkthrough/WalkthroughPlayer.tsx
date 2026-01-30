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

interface ScriptSegment {
  id: string
  order: number
  text: string
  startLine: number
  endLine: number
  highlightLines: number[]
  durationEstimate: number
}

interface WalkthroughScript {
  id: string
  filePath: string
  title: string
  summary: string
  totalDuration: number
  segments: ScriptSegment[]
}

interface WalkthroughPlayerProps {
  code: string
  script: WalkthroughScript
  filePath: string
  isPlaying: boolean
  onPlayingChange: (playing: boolean) => void
}

export function WalkthroughPlayer({
  code,
  script,
  filePath,
  isPlaying,
  onPlayingChange,
}: WalkthroughPlayerProps) {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [segmentProgress, setSegmentProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showTranscript, setShowTranscript] = useState(true)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [useTTS, setUseTTS] = useState(true) // Use browser TTS
  
  const codeContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const currentSegment = script.segments[currentSegmentIndex]
  const lines = code.split('\n')

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = new SpeechSynthesisUtterance()
      speechSynthRef.current.rate = playbackSpeed
      speechSynthRef.current.volume = isMuted ? 0 : 1
      
      // Set up event handlers
      speechSynthRef.current.onend = () => {
        // Move to next segment when speech ends
        if (currentSegmentIndex < script.segments.length - 1) {
          setCurrentSegmentIndex((idx) => idx + 1)
          setSegmentProgress(0)
        } else {
          onPlayingChange(false)
          setSegmentProgress(100)
        }
      }
      
      speechSynthRef.current.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        setAudioError('Speech synthesis failed')
      }
    }
    
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Update speech rate when playback speed changes
  useEffect(() => {
    if (speechSynthRef.current) {
      speechSynthRef.current.rate = playbackSpeed
    }
  }, [playbackSpeed])

  // Update speech volume when muted state changes
  useEffect(() => {
    if (speechSynthRef.current) {
      speechSynthRef.current.volume = isMuted ? 0 : 1
    }
  }, [isMuted])

  // Handle play/pause with speech synthesis
  useEffect(() => {
    if (!currentSegment || !useTTS) return
    
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioError('Speech synthesis not supported in this browser')
      return
    }

    if (isPlaying) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      // Speak current segment
      if (speechSynthRef.current) {
        speechSynthRef.current.text = currentSegment.text
        speechSynthRef.current.rate = playbackSpeed
        speechSynthRef.current.volume = isMuted ? 0 : 1
        window.speechSynthesis.speak(speechSynthRef.current)
      }
    } else {
      window.speechSynthesis.cancel()
    }
  }, [isPlaying, currentSegmentIndex, currentSegment, useTTS])

  // Calculate total progress
  const totalProgress = (() => {
    if (!currentSegment || !script.segments.length) return 0
    const completedDuration = script.segments
      .slice(0, currentSegmentIndex)
      .reduce((sum, seg) => sum + seg.durationEstimate, 0)
    const currentDuration = currentSegment.durationEstimate * (segmentProgress / 100)
    return script.totalDuration > 0 
      ? ((completedDuration + currentDuration) / script.totalDuration) * 100 
      : 0
  })()

  // Auto-scroll to highlighted lines
  useEffect(() => {
    if (codeContainerRef.current && currentSegment) {
      const targetLine = currentSegment.startLine
      const lineHeight = 28 // Approximate line height in pixels
      const scrollTarget = (targetLine - 5) * lineHeight // 5 lines offset
      
      codeContainerRef.current.scrollTo({
        top: Math.max(0, scrollTarget),
        behavior: 'smooth',
      })
    }
  }, [currentSegment])

  // Progress tracking for visual feedback
  useEffect(() => {
    if (!isPlaying || !currentSegment) return

    const duration = (currentSegment.durationEstimate * 1000) / playbackSpeed
    const interval = duration / 100

    const timer = setInterval(() => {
      setSegmentProgress((prev) => {
        if (prev >= 100) {
          return 100
        }
        return prev + 1
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, currentSegmentIndex, playbackSpeed, currentSegment])

  const handleSkipBack = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex((idx) => idx - 1)
      setSegmentProgress(0)
    }
  }

  const handleSkipForward = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (currentSegmentIndex < script.segments.length - 1) {
      setCurrentSegmentIndex((idx) => idx + 1)
      setSegmentProgress(0)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const percentage = ((e.clientX - rect.left) / rect.width) * 100
    
    // Find which segment this corresponds to
    let accumulatedDuration = 0
    for (let i = 0; i < script.segments.length; i++) {
      const segmentPercentage = (script.segments[i].durationEstimate / script.totalDuration) * 100
      if (accumulatedDuration + segmentPercentage >= percentage) {
        setCurrentSegmentIndex(i)
        const withinSegment = ((percentage - accumulatedDuration) / segmentPercentage) * 100
        setSegmentProgress(Math.max(0, Math.min(100, withinSegment)))
        break
      }
      accumulatedDuration += segmentPercentage
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentTime = (() => {
    const completedDuration = script.segments
      .slice(0, currentSegmentIndex)
      .reduce((sum, seg) => sum + seg.durationEstimate, 0)
    return completedDuration + (currentSegment.durationEstimate * (segmentProgress / 100))
  })()

  return (
    <div className="h-full flex flex-col">
      {/* Code viewer */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto bg-dv-bg p-6 font-mono text-sm"
      >
        {lines.map((line, index) => {
          const lineNumber = index + 1
          const isHighlighted = currentSegment.highlightLines.includes(lineNumber)
          const isInRange = lineNumber >= currentSegment.startLine && lineNumber <= currentSegment.endLine

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
                  ? 'rgba(88, 166, 255, 0.15)' 
                  : isInRange 
                    ? 'rgba(88, 166, 255, 0.05)' 
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
                  <p className="text-dv-text leading-relaxed">{currentSegment.text}</p>
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
              <span className="text-dv-text-muted">{formatTime(script.totalDuration)}</span>
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

// Simple syntax highlighting component
function SyntaxHighlight({ code }: { code: string }) {
  // This is a simplified syntax highlighter
  // In production, use a proper library like Prism or Shiki
  const patterns = [
    { regex: /(#.*)$/gm, className: 'text-dv-text-muted' }, // Comments
    { regex: /\b(def|class|return|if|else|elif|for|while|try|except|import|from|async|await|with|as|None|True|False)\b/g, className: 'text-dv-purple' }, // Keywords
    { regex: /(".*?"|'.*?'|"""[\s\S]*?"""|'''[\s\S]*?''')/g, className: 'text-dv-success' }, // Strings
    { regex: /\b(\d+\.?\d*)\b/g, className: 'text-dv-warning' }, // Numbers
    { regex: /\b([A-Z][a-zA-Z0-9_]*)\b/g, className: 'text-dv-cyan' }, // Classes
    { regex: /\b(\w+)\s*\(/g, className: 'text-dv-accent' }, // Functions
  ]

  let result = code

  // Apply each pattern (simplified - in production use proper tokenization)
  patterns.forEach(({ regex, className }) => {
    result = result.replace(regex, (match) => {
      return `<span class="${className}">${match}</span>`
    })
  })

  return <span dangerouslySetInnerHTML={{ __html: result }} />
}

