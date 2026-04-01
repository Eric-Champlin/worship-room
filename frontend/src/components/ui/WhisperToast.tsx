import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSoundEffects } from '@/hooks/useSoundEffects'

// ── Types ───────────────────────────────────────────────────────────
export interface WhisperToastContent {
  message: string
  highlightedText?: string
  closingMessage?: string
  ctaLabel?: string
  ctaTo?: string
  duration?: number
  soundId?: 'whisper' | 'sparkle' | 'chime'
}

interface WhisperToastContextValue {
  showWhisperToast: (content: WhisperToastContent) => void
}

// ── Context ─────────────────────────────────────────────────────────
const WhisperToastContext = createContext<WhisperToastContextValue | null>(null)

export function useWhisperToast(): WhisperToastContextValue {
  const ctx = useContext(WhisperToastContext)
  if (!ctx) {
    throw new Error('useWhisperToast must be used within WhisperToastProvider')
  }
  return ctx
}

// ── Provider ────────────────────────────────────────────────────────
export function WhisperToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<WhisperToastContent | null>(null)
  const [visible, setVisible] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = useReducedMotion()
  const { playSoundEffect } = useSoundEffects()

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    setVisible(false)
    const exitDuration = reducedMotion ? 100 : 300
    exitTimerRef.current = setTimeout(() => {
      setToast(null)
    }, exitDuration)
  }, [clearTimers, reducedMotion])

  const showWhisperToast = useCallback(
    (content: WhisperToastContent) => {
      clearTimers()
      setToast(content)

      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        setVisible(true)
      })

      if (content.soundId) {
        playSoundEffect(content.soundId)
      }

      const duration = content.duration ?? 6000
      dismissTimerRef.current = setTimeout(() => {
        dismiss()
      }, duration)
    },
    [clearTimers, dismiss, playSoundEffect],
  )

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  return (
    <WhisperToastContext.Provider value={{ showWhisperToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="whisper-toast"
          className={cn(
            'fixed bottom-6 left-1/2 z-50 mx-4 w-[calc(100%-2rem)] -translate-x-1/2 cursor-pointer sm:mx-0 sm:w-auto sm:max-w-sm',
            'transition-all',
            reducedMotion
              ? 'duration-100'
              : 'duration-200 ease-out',
            visible
              ? 'translate-y-0 opacity-100'
              : reducedMotion
                ? 'opacity-0'
                : 'translate-y-4 opacity-0',
          )}
          onClick={dismiss}
          onKeyDown={(e) => {
            if (e.key === 'Escape') dismiss()
          }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 backdrop-blur-md">
            <p className="font-serif text-sm italic text-white/70">
              {toast.message}
            </p>

            {toast.highlightedText && (
              <blockquote className="mt-2 font-serif text-sm italic text-white/80">
                &ldquo;{toast.highlightedText}&rdquo;
              </blockquote>
            )}

            {toast.closingMessage && (
              <p className="mt-2 font-serif text-sm italic text-white/60">
                {toast.closingMessage}
              </p>
            )}

            {toast.ctaLabel && toast.ctaTo && (
              <Link
                to={toast.ctaTo}
                className="mt-2 inline-block font-sans text-sm text-primary-lt underline"
                onClick={(e) => e.stopPropagation()}
              >
                {toast.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}
    </WhisperToastContext.Provider>
  )
}
