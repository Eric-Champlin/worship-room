import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSettings,
  saveSettings,
  updateSettings,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
} from '../settings-storage'
import { setPushNotificationFlag } from '@/lib/notifications-storage'

describe('settings-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // --- getSettings ---

  it('returns defaults when no localStorage', () => {
    const settings = getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults on corrupted JSON', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-valid-json{{{')
    const settings = getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults when stored value is array', () => {
    localStorage.setItem(SETTINGS_KEY, '[]')
    const settings = getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults when stored value is string', () => {
    localStorage.setItem(SETTINGS_KEY, '"hello"')
    const settings = getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('deep-merges partial data with defaults', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ notifications: { pushNotifications: true } }),
    )
    const settings = getSettings()
    expect(settings.notifications.pushNotifications).toBe(true)
    // All other notification defaults preserved
    expect(settings.notifications.inAppNotifications).toBe(true)
    expect(settings.notifications.encouragements).toBe(true)
    // Profile defaults preserved
    expect(settings.profile.avatarId).toBe('default')
    // Privacy defaults preserved
    expect(settings.privacy.nudgePermission).toBe('friends')
  })

  // --- saveSettings ---

  it('persists to localStorage', () => {
    const modified = {
      ...DEFAULT_SETTINGS,
      profile: { ...DEFAULT_SETTINGS.profile, displayName: 'Eric' },
    }
    saveSettings(modified)
    const raw = localStorage.getItem(SETTINGS_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.profile.displayName).toBe('Eric')
  })

  // --- updateSettings ---

  it('merges partial update correctly', () => {
    const updated = updateSettings({ profile: { displayName: 'New Name' } })
    expect(updated.profile.displayName).toBe('New Name')
    expect(updated.profile.avatarId).toBe('default')
    // Verify persisted
    const fromStorage = getSettings()
    expect(fromStorage.profile.displayName).toBe('New Name')
  })

  it('does not clobber other sections on partial update', () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      profile: { ...DEFAULT_SETTINGS.profile, displayName: 'Keep This' },
    })
    updateSettings({ notifications: { pushNotifications: true } })
    const result = getSettings()
    expect(result.profile.displayName).toBe('Keep This')
    expect(result.notifications.pushNotifications).toBe(true)
  })

  // --- Compatibility with notifications-storage.ts ---

  it('respects pushNotification flag set by notifications-storage', () => {
    setPushNotificationFlag(true)
    const settings = getSettings()
    expect(settings.notifications.pushNotifications).toBe(true)
  })

  it('deep-merge preserves notifications-storage writes after settings save', () => {
    setPushNotificationFlag(true)
    // Now save settings — should merge, not clobber
    const settings = getSettings()
    saveSettings(settings)
    const reRead = getSettings()
    expect(reRead.notifications.pushNotifications).toBe(true)
  })

  // --- Returned defaults are not shared references ---

  it('returned defaults are independent copies', () => {
    const a = getSettings()
    const b = getSettings()
    a.privacy.blockedUsers.push('user-1')
    expect(b.privacy.blockedUsers).toEqual([])
  })
})
