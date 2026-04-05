import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWhisperToast } from '@/hooks/useWhisperToast'
import { canShowSurprise, markSurpriseShown } from '@/services/surprise-storage'
import { getBookDisplayName } from '@/services/bible-annotations-storage'
import { BIBLE_HIGHLIGHTS_KEY } from '@/constants/bible'
import type { BibleHighlight } from '@/types/bible'
import type { PersonalPrayer } from '@/types/personal-prayer'

const PRAYER_LIST_KEY = 'wr_prayer_list'
const ECHO_DELAY_MS = 3000

function readHighlights(): BibleHighlight[] {
  try {
    const raw = localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (_e) {
    return []
  }
}

function readPrayers(): PersonalPrayer[] {
  try {
    const raw = localStorage.getItem(PRAYER_LIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (_e) {
    return []
  }
}

function formatHighlightDate(createdAt: string): string {
  try {
    const date = new Date(createdAt)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  } catch (_e) {
    return 'a previous visit'
  }
}

export function useScriptureEcho(
  bookSlug: string,
  chapter: number,
  isLoading: boolean,
): void {
  const { isAuthenticated } = useAuth()
  const { showWhisperToast } = useWhisperToast()
  const shownChaptersRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isAuthenticated) return
    if (isLoading) return
    if (!bookSlug || !chapter) return
    if (!canShowSurprise()) return

    const key = `${bookSlug}-${chapter}`
    if (shownChaptersRef.current.has(key)) return

    // Check for highlight match
    const highlights = readHighlights()
    const matchingHighlight = highlights.find(
      (h) => h.book === bookSlug && h.chapter === chapter,
    )

    // Check for prayer match
    const bookName = getBookDisplayName(bookSlug)
    const prayers = readPrayers()
    const matchingPrayer = prayers.find(
      (p) =>
        p.title.toLowerCase().includes(bookName.toLowerCase()) ||
        p.description.toLowerCase().includes(bookName.toLowerCase()),
    )

    if (!matchingHighlight && !matchingPrayer) return

    // Mark as shown for this chapter immediately to prevent re-trigger
    shownChaptersRef.current.add(key)

    const timer = setTimeout(() => {
      let message: string
      if (matchingHighlight && !matchingPrayer) {
        const dateStr = formatHighlightDate(matchingHighlight.createdAt)
        message = `You highlighted a verse here on ${dateStr}. Your journey with this passage continues.`
      } else if (matchingPrayer && !matchingHighlight) {
        message = `You prayed about "${matchingPrayer.title}" and this chapter speaks to that. God's Word meets you where you are.`
      } else {
        message = "You've been here before. There's something in this chapter for you today."
      }

      showWhisperToast({
        message,
        duration: 6000,
        soundId: 'whisper',
      })

      markSurpriseShown()
    }, ECHO_DELAY_MS)

    return () => clearTimeout(timer)
  }, [isAuthenticated, isLoading, bookSlug, chapter, showWhisperToast])
}
