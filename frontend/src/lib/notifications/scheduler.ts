import { selectVotdForDate } from '@/lib/bible/votdSelector'
import { loadChapterWeb } from '@/data/bible'
import { getStreak } from '@/lib/bible/streakStore'
import { getTodayLocal } from '@/lib/bible/dateUtils'
import { getNotificationPrefs, updateNotificationPrefs } from './preferences'
import { generateDailyVersePayload, generateStreakReminderPayload } from './content'
import { storePayload } from './store'

/**
 * Prepare notification payloads for today and fire if overdue.
 * Called once per app load — no timers, no intervals.
 */
export async function prepareAndSchedule(): Promise<void> {
  const prefs = getNotificationPrefs()
  if (!prefs.enabled) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  const today = getTodayLocal()

  // Prepare daily verse payload
  if (prefs.dailyVerse) {
    const entry = selectVotdForDate(new Date())
    let verseText = entry.ref // fallback to just the reference
    try {
      const chapter = await loadChapterWeb(entry.book, entry.chapter)
      if (chapter) {
        const verses = chapter.verses.filter(
          (v) => v.number >= entry.startVerse && v.number <= entry.endVerse,
        )
        if (verses.length > 0) {
          verseText = verses.map((v) => v.text).join(' ')
        }
      }
    } catch {
      // Use reference-only fallback
    }

    const payload = generateDailyVersePayload(entry, verseText)
    await storePayload({
      key: 'daily-verse',
      payload,
      scheduledDate: today,
      fired: prefs.lastDailyVerseFired === today,
    })

    // Check if it's time to fire
    if (prefs.lastDailyVerseFired !== today && isTimeToFire(prefs.dailyVerseTime)) {
      await fireNotification(payload)
      updateNotificationPrefs({ lastDailyVerseFired: today })
    }
  }

  // Prepare streak reminder payload
  if (prefs.streakReminder) {
    const payload = generateStreakReminderPayload(today)
    await storePayload({
      key: 'streak-reminder',
      payload,
      scheduledDate: today,
      fired: prefs.lastStreakReminderFired === today,
    })

    // Fire streak reminder if: time has passed, not fired today, user hasn't read today
    const streak = getStreak()
    const hasReadToday = streak.lastReadDate === today
    const reminderTime = getStreakReminderTime(prefs.dailyVerseTime)

    if (
      prefs.lastStreakReminderFired !== today &&
      !hasReadToday &&
      isTimeToFire(reminderTime)
    ) {
      await fireNotification(payload)
      updateNotificationPrefs({ lastStreakReminderFired: today })
    }
  }
}

/**
 * Fire a test notification immediately. Used by the "Send test notification" button.
 * Returns false if permission is not granted.
 */
export async function fireTestNotification(): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false
  }

  const entry = selectVotdForDate(new Date())
  let verseText = entry.ref
  try {
    const chapter = await loadChapterWeb(entry.book, entry.chapter)
    if (chapter) {
      const verses = chapter.verses.filter(
        (v) => v.number >= entry.startVerse && v.number <= entry.endVerse,
      )
      if (verses.length > 0) {
        verseText = verses.map((v) => v.text).join(' ')
      }
    }
  } catch {
    // Use reference-only fallback
  }

  const payload = generateDailyVersePayload(entry, verseText)
  await fireNotification(payload)
  return true
}

/**
 * Register periodic background sync (Chrome/Edge only).
 * Falls back silently if not supported or denied.
 */
export async function registerPeriodicSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready

  if ('periodicSync' in registration) {
    try {
      await (registration as unknown as { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync.register(
        'wr-notification-check',
        { minInterval: 60 * 60 * 1000 }, // 1 hour
      )
    } catch {
      // Permission denied or not supported — acceptable
    }
  }
}

/** Check if the current local time is at or past the given HH:MM time. */
function isTimeToFire(timeStr: string): boolean {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const targetMinutes = hours * 60 + minutes
  return nowMinutes >= targetMinutes
}

/**
 * Calculate streak reminder time: dailyVerseTime + 10 hours, capped at 20:00.
 */
function getStreakReminderTime(dailyVerseTime: string): string {
  const [hours, minutes] = dailyVerseTime.split(':').map(Number)
  const reminderHour = Math.min(hours + 10, 20)
  return `${String(reminderHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Fire a notification via the service worker's showNotification API. */
async function fireNotification(payload: {
  title: string
  body: string
  icon: string
  badge: string
  tag: string
  data: { url: string }
}): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
    })
  } catch {
    // SW not available — notification not fired
  }
}
