import { useEffect } from 'react'
import {
  Play,
  Pause,
  Square,
  Sunrise,
  Moon,
  Leaf,
  Heart,
  Sparkles,
  Unlock,
  Shield,
  HandHeart,
} from 'lucide-react'
import type { GuidedPrayerSession } from '@/types/guided-prayer'
import { useGuidedPrayerPlayer } from '@/hooks/useGuidedPrayerPlayer'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { KaraokeText } from '@/components/daily/KaraokeText'
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal'

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sunrise,
  Moon,
  Leaf,
  Heart,
  Sparkles,
  Unlock,
  Shield,
  HandHeart,
}

interface GuidedPrayerPlayerProps {
  session: GuidedPrayerSession
  onClose: () => void
  onComplete: () => void
  onJournalAboutThis: () => void
  onTryAnother: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function GuidedPrayerPlayer({
  session,
  onClose,
  onComplete,
  onJournalAboutThis,
  onTryAnother,
}: GuidedPrayerPlayerProps) {
  const prefersReduced = useReducedMotion()
  const audioState = useAudioState()
  const audioDispatch = useAudioDispatch()

  const player = useGuidedPrayerPlayer({
    session,
    onComplete,
    onClose,
  })

  const containerRef = useFocusTrap(true, player.isComplete ? onClose : player.stop)

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Auto-play on mount
  useEffect(() => {
    if (!player.isPlaying && !player.isPaused && !player.isComplete) {
      player.play()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ThemeIcon = ICON_COMPONENTS[session.icon]

  const handleOpenDrawer = () => {
    audioDispatch({ type: 'OPEN_DRAWER' })
  }

  const handleStopAmbient = () => {
    audioDispatch({ type: 'STOP_ALL' })
  }

  if (player.isComplete) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-hero-dark"
        role="dialog"
        aria-label={`${session.title} complete`}
      >
        <div className="flex w-full max-w-lg flex-col items-center px-4 text-center">
          <p className="font-script text-5xl text-white sm:text-6xl">Amen</p>
          <p className="mt-3 text-lg text-white/70">{session.title}</p>
          <p className="mt-1 text-sm text-white/50">
            {session.durationMinutes} minutes of guided prayer
          </p>

          <div className="mt-8">
            <p className="font-serif italic text-white/80 text-lg leading-relaxed">
              &ldquo;{session.completionVerse.text}&rdquo;
            </p>
            <p className="mt-2 text-xs text-white/40">
              &mdash; {session.completionVerse.reference}
            </p>
          </div>

          <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto">
            <button
              type="button"
              onClick={onJournalAboutThis}
              className="w-full rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto"
            >
              Journal about this
            </button>
            <button
              type="button"
              onClick={onTryAnother}
              className="w-full rounded-lg border border-white/30 px-8 py-3 text-white transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto"
            >
              Try another session
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 text-sm text-white/50 underline transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Return to Prayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate msPerWord for TTS-unavailable fallback
  const segment = player.currentSegment
  const msPerWord =
    segment?.type === 'narration' && !player.ttsAvailable
      ? (segment.durationSeconds * 1000) /
        Math.max(segment.text.split(/\s+/).length, 1)
      : undefined

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-hero-dark"
      role="dialog"
      aria-label={`Guided prayer: ${session.title}`}
    >
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite">
        {segment?.type === 'narration'
          ? `Narration: ${segment.text.slice(0, 60)}...`
          : 'Silence: Be still...'}
      </div>

      <div className="flex w-full max-w-lg flex-col items-center px-4 sm:max-w-xl">
        {/* Theme icon + title */}
        <div className="mb-8 text-center">
          {ThemeIcon && (
            <ThemeIcon className="mx-auto mb-3 h-12 w-12 text-white/30 lg:h-16 lg:w-16" />
          )}
          <h2 className="font-semibold text-white text-lg sm:text-xl">{session.title}</h2>
        </div>

        {/* Content area */}
        <div className="min-h-[120px] w-full text-center">
          {segment?.type === 'narration' ? (
            <div
              className={`transition-opacity duration-500 ${prefersReduced ? '' : 'animate-fade-in'}`}
              key={`narration-${player.currentSegmentIndex}`}
            >
              {player.ttsAvailable ? (
                <KaraokeText
                  text={segment.text}
                  currentWordIndex={player.currentWordIndex}
                  className="font-serif italic text-white text-lg leading-relaxed sm:text-xl"
                />
              ) : (
                <KaraokeTextReveal
                  text={segment.text}
                  msPerWord={msPerWord}
                  className="font-serif italic text-white text-lg leading-relaxed sm:text-xl"
                />
              )}
            </div>
          ) : (
            <div
              className={`transition-opacity duration-500 ${prefersReduced ? '' : 'animate-fade-in'}`}
              key={`silence-${player.currentSegmentIndex}`}
            >
              <p className="font-serif italic text-white/30 text-xl">
                Be still...
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-8 w-full mx-4 sm:mx-0" role="progressbar"
          aria-valuenow={Math.floor(player.elapsedSeconds)}
          aria-valuemin={0}
          aria-valuemax={player.totalDurationSeconds}
          aria-label={`Session progress: ${formatTime(player.elapsedSeconds)} of ${formatTime(player.totalDurationSeconds)}`}
        >
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-[250ms]"
              style={{ width: `${player.progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-white/40">
            {formatTime(player.elapsedSeconds)} / {formatTime(player.totalDurationSeconds)}
          </p>
        </div>

        {/* Transport controls */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={player.isPlaying ? player.pause : player.play}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white" />
            )}
          </button>
          <button
            type="button"
            onClick={player.stop}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Stop and close"
          >
            <Square className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Sound indicator */}
        {player.autoStartedAmbient && audioState.activeSounds.length > 0 && (
          <div className="mt-4 text-center text-xs text-white/40">
            Sound: {player.ambientSceneName}
            <span className="mx-1 text-white/20">&middot;</span>
            <button
              type="button"
              onClick={handleOpenDrawer}
              className="text-white/40 underline hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Change
            </button>
            <span className="mx-1 text-white/20">&middot;</span>
            <button
              type="button"
              onClick={handleStopAmbient}
              className="text-white/40 underline hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
