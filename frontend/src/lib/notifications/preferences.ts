import type { NotificationPrefs } from './types'
import { DEFAULT_PREFS } from './types'

const NOTIFICATION_PREFS_KEY = 'wr_notification_prefs'

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    // Validate shape — return defaults for any missing fields
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_PREFS.enabled,
      dailyVerse: typeof parsed.dailyVerse === 'boolean' ? parsed.dailyVerse : DEFAULT_PREFS.dailyVerse,
      streakReminder:
        typeof parsed.streakReminder === 'boolean' ? parsed.streakReminder : DEFAULT_PREFS.streakReminder,
      dailyVerseTime:
        typeof parsed.dailyVerseTime === 'string' ? parsed.dailyVerseTime : DEFAULT_PREFS.dailyVerseTime,
      lastDailyVerseFired:
        typeof parsed.lastDailyVerseFired === 'string'
          ? parsed.lastDailyVerseFired
          : DEFAULT_PREFS.lastDailyVerseFired,
      lastStreakReminderFired:
        typeof parsed.lastStreakReminderFired === 'string'
          ? parsed.lastStreakReminderFired
          : DEFAULT_PREFS.lastStreakReminderFired,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function setNotificationPrefs(prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // localStorage unavailable — degrade gracefully
  }
}

export function updateNotificationPrefs(updates: Partial<NotificationPrefs>): NotificationPrefs {
  const current = getNotificationPrefs()
  const merged = { ...current, ...updates }
  setNotificationPrefs(merged)
  return merged
}
