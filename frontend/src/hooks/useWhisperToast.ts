import { createContext, useContext } from 'react'

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

export interface WhisperToastContextValue {
  showWhisperToast: (content: WhisperToastContent) => void
}

// ── Context ─────────────────────────────────────────────────────────
export const WhisperToastContext = createContext<WhisperToastContextValue | null>(null)

export function useWhisperToast(): WhisperToastContextValue {
  const ctx = useContext(WhisperToastContext)
  if (!ctx) {
    throw new Error('useWhisperToast must be used within WhisperToastProvider')
  }
  return ctx
}
