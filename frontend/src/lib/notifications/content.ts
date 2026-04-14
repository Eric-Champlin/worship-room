import type { VotdListEntry } from '@/types/bible-landing'
import type { NotificationPayload } from './types'

const MAX_BODY_LENGTH = 120

const STREAK_REMINDER_MESSAGES = [
  'A short chapter, a moment of peace. No pressure.',
  'Your rhythm is still here. Come back when you can.',
  'Five minutes of scripture is still five minutes of scripture.',
]

/**
 * Deterministic hash of a date string for consistent message rotation.
 * Uses a simple char-code sum — non-cryptographic, just needs to be stable.
 */
export function hashDate(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash += dateStr.charCodeAt(i)
  }
  return hash
}

export function generateDailyVersePayload(
  votdEntry: VotdListEntry,
  verseText: string,
): NotificationPayload {
  const body =
    verseText.length > MAX_BODY_LENGTH ? verseText.slice(0, MAX_BODY_LENGTH) + '\u2026' : verseText

  return {
    title: votdEntry.ref,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'daily-verse',
    data: {
      url: `/bible/${votdEntry.book}/${votdEntry.chapter}?verse=${votdEntry.startVerse}`,
    },
  }
}

export function generateStreakReminderPayload(today?: string): NotificationPayload {
  const dateStr = today ?? new Date().toISOString().slice(0, 10)
  const index = hashDate(dateStr) % STREAK_REMINDER_MESSAGES.length

  return {
    title: 'Still time to read today',
    body: STREAK_REMINDER_MESSAGES[index],
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'streak-reminder',
    data: {
      url: '/daily?tab=devotional',
    },
  }
}
