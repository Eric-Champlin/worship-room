/** Stored in wr_notification_prefs */
export interface NotificationPrefs {
  enabled: boolean
  dailyVerse: boolean
  streakReminder: boolean
  dailyVerseTime: string // "HH:MM" 24h format, user's local timezone
  lastDailyVerseFired: string // "YYYY-MM-DD"
  lastStreakReminderFired: string // "YYYY-MM-DD"
}

/** Stored in wr_push_subscription */
export interface PushSubscriptionRecord {
  endpoint: string
  keys: { p256dh: string; auth: string }
  applicationServerKey: string // VAPID public key at time of subscription
  createdAt: number // epoch ms
}

/** Notification payload for both push and local-fallback */
export interface NotificationPayload {
  title: string
  body: string
  icon: string
  badge: string
  tag: 'daily-verse' | 'streak-reminder'
  data: { url: string }
}

/** Stored in IDB 'wr-notifications' → 'payloads' store */
export interface StoredPayload {
  key: 'daily-verse' | 'streak-reminder'
  payload: NotificationPayload
  scheduledDate: string // "YYYY-MM-DD"
  fired: boolean
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  dailyVerse: true,
  streakReminder: true,
  dailyVerseTime: '08:00',
  lastDailyVerseFired: '',
  lastStreakReminderFired: '',
}
