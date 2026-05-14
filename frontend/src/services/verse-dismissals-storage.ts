// Spec 6.8 — wr_verse_dismissals storage helpers. Plain localStorage object
// (not a reactive store — single consumer). Tracks the 3-in-a-row off-ramp
// counter that surfaces a one-time "want to turn this off?" prompt.

import type { VerseDismissals } from '@/types/verse-finds-you'

export const VERSE_DISMISSALS_KEY = 'wr_verse_dismissals'

const EMPTY: VerseDismissals = { count: 0, promptShown: false }

export function getVerseDismissals(): VerseDismissals {
  try {
    const raw = localStorage.getItem(VERSE_DISMISSALS_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return {
      count: typeof parsed?.count === 'number' ? parsed.count : 0,
      promptShown: parsed?.promptShown === true,
    }
  } catch {
    return { ...EMPTY }
  }
}

export function incrementDismissalCount(): VerseDismissals {
  const current = getVerseDismissals()
  const next: VerseDismissals = {
    count: current.count + 1,
    promptShown: current.promptShown,
  }
  saveDismissals(next)
  return next
}

export function resetDismissalCount(): void {
  saveDismissals({ count: 0, promptShown: false })
}

export function markPromptShown(): void {
  const current = getVerseDismissals()
  saveDismissals({ count: current.count, promptShown: true })
}

function saveDismissals(v: VerseDismissals): void {
  try {
    localStorage.setItem(VERSE_DISMISSALS_KEY, JSON.stringify(v))
  } catch {
    // localStorage may be unavailable (private browsing, quota); silent failure
    // is acceptable per spec — dismissals are a courtesy gate, not a security
    // boundary, and the next session resets to zero anyway.
  }
}
