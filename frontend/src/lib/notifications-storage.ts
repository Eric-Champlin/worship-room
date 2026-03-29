import type { NotificationEntry } from '@/types/dashboard'
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications-mock-data'

const STORAGE_KEY = 'wr_notifications'
const MAX_NOTIFICATIONS = 50

export function getNotifications(): NotificationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      forceSetMockData()
      return [...MOCK_NOTIFICATIONS]
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      forceSetMockData()
      return [...MOCK_NOTIFICATIONS]
    }
    return parsed as NotificationEntry[]
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    forceSetMockData()
    return [...MOCK_NOTIFICATIONS]
  }
}

function forceSetMockData(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_NOTIFICATIONS))
  } catch (_e) {
    // localStorage may be unavailable
  }
}

export function setNotifications(notifications: NotificationEntry[]): void {
  try {
    const capped = notifications.slice(0, MAX_NOTIFICATIONS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped))
  } catch (_e) {
    // localStorage unavailable — degrade gracefully
  }
}

export function seedNotificationsIfNeeded(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_NOTIFICATIONS))
    }
  } catch (_e) {
    // localStorage unavailable — degrade gracefully
  }
}

// --- Push Notification Stubs (Phase 3 prep) ---

const SETTINGS_KEY = 'wr_settings'

export function getPushNotificationFlag(): boolean {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return settings?.notifications?.pushNotifications ?? false
  } catch (_e) {
    return false
  }
}

export function setPushNotificationFlag(enabled: boolean): void {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    if (!settings.notifications) settings.notifications = {}
    settings.notifications.pushNotifications = enabled
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (_e) {
    // localStorage unavailable
  }
}
