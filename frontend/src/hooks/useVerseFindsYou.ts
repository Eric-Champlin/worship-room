// Spec 6.8 — Verse-Finds-You hook. Orchestrates the API fetch + session
// suppression + 3-in-a-row dismissal tracking. Local React state only — NOT a
// reactive store (single consumer per page mount; `sessionSuppressed` is a
// `useRef` so it doesn't re-render on toggle).

import { useCallback, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import type { TriggerType, VerseSurfacingResult } from '@/types/verse-finds-you'
import { useSettings } from './useSettings'
import {
  incrementDismissalCount,
  resetDismissalCount,
  markPromptShown,
} from '@/services/verse-dismissals-storage'

export interface UseVerseFindsYouReturn {
  /** Latest surfaced verse (or null if dismissed / no fetch / non-success). */
  verse: VerseSurfacingResult | null
  /**
   * The trigger type that surfaced the current verse (or null if none).
   * Consumers MUST pass this through to the {@link VerseFindsYou} card's
   * `trigger` prop so the per-trigger prefix copy is correct
   * (Gate-G-COPY — "The word found you today:" / "A word as you gave comfort:"
   * / "A word as you keep watch:"). When the same page surfaces verses from
   * more than one trigger (e.g., PrayerWall hosts post-compose + reading-time),
   * a hardcoded prop would render the wrong prefix.
   */
  lastTrigger: TriggerType | null
  /** Fire the API call from a trigger surface. No-op if toggle is OFF or session is suppressed. */
  trigger: (triggerType: TriggerType, context?: string) => Promise<void>
  /** Mark current verse dismissed; returns whether to surface the off-ramp prompt. */
  dismiss: () => { showOffRampPrompt: boolean }
  /** User engaged with the verse (e.g., tapped Save) — resets the 3-in-a-row counter. */
  acknowledgeEngagement: () => void
  /** Mark the off-ramp prompt as shown so it doesn't re-surface. */
  acknowledgePromptShown: () => void
  /** Track that a verseId has been saved this session (1 save per verse per session). */
  markSaved: (verseId: string) => void
  /** Whether the given verseId was saved this session. */
  wasSaved: (verseId: string) => boolean
}

export function useVerseFindsYou(): UseVerseFindsYouReturn {
  const { settings } = useSettings()
  const [verse, setVerse] = useState<VerseSurfacingResult | null>(null)
  const [lastTrigger, setLastTrigger] = useState<TriggerType | null>(null)
  const sessionSuppressed = useRef(false)
  const savedVerseIds = useRef<Set<string>>(new Set())

  const trigger = useCallback(
    async (triggerType: TriggerType, context?: string) => {
      // Gate-G-DEFAULT-OFF / W28: if toggle is OFF, NO API call. The hook
      // exits before constructing a fetch — confirmed by T-SEC-1.
      if (!settings.verseFindsYou.enabled) return
      if (sessionSuppressed.current) return

      const params = new URLSearchParams({
        trigger: triggerType,
        enabled: 'true',
        ...(context ? { context } : {}),
      })

      try {
        const result = await apiFetch<VerseSurfacingResult>(
          `/api/v1/verse-finds-you?${params.toString()}`,
        )
        if (result.verse) {
          setVerse(result)
          setLastTrigger(triggerType)
        } else {
          setVerse(null)
          setLastTrigger(null)
        }
      } catch (err) {
        // 401, 429, network errors — silent failure on the client (W10 /
        // Gate-G-SILENT-FAILURE). The verse-card never surfaces an error.
        // Swallow ApiError specifically; let unrelated runtime errors propagate
        // so they remain debuggable.
        if (err instanceof ApiError) {
          setVerse(null)
          setLastTrigger(null)
        } else {
          throw err
        }
      }
    },
    [settings.verseFindsYou.enabled],
  )

  const dismiss = useCallback((): { showOffRampPrompt: boolean } => {
    setVerse(null)
    setLastTrigger(null)
    sessionSuppressed.current = true
    const next = incrementDismissalCount()
    return { showOffRampPrompt: next.count >= 3 && !next.promptShown }
  }, [])

  const acknowledgeEngagement = useCallback(() => {
    resetDismissalCount()
  }, [])

  const acknowledgePromptShown = useCallback(() => {
    markPromptShown()
  }, [])

  const markSaved = useCallback((verseId: string) => {
    savedVerseIds.current.add(verseId)
    // Saving counts as engagement — resets the 3-in-a-row dismissal counter
    // so a save+dismiss+save+dismiss+save+dismiss user doesn't trigger off-ramp.
    resetDismissalCount()
  }, [])

  const wasSaved = useCallback(
    (verseId: string): boolean => savedVerseIds.current.has(verseId),
    [],
  )

  return {
    verse,
    lastTrigger,
    trigger,
    dismiss,
    acknowledgeEngagement,
    acknowledgePromptShown,
    markSaved,
    wasSaved,
  }
}
