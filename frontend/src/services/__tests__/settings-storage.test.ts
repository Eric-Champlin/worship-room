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

  // --- Spec 6.1 — prayerWall namespace (Step 11) ---

  it('returns prayerWall.prayerReceiptsVisible=true by default on fresh localStorage', () => {
    const settings = getSettings()
    expect(settings.prayerWall.prayerReceiptsVisible).toBe(true)
  })

  it('backward-compat: stored blob missing prayerWall key merges in defaults', () => {
    // Simulate an older blob written before Spec 6.1 — no prayerWall namespace
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        profile: { displayName: 'Legacy' },
        notifications: { pushNotifications: true },
        privacy: { nudgePermission: 'nobody' },
      }),
    )
    const settings = getSettings()
    expect(settings.prayerWall.prayerReceiptsVisible).toBe(true)
    // Old data preserved
    expect(settings.profile.displayName).toBe('Legacy')
    expect(settings.notifications.pushNotifications).toBe(true)
    expect(settings.privacy.nudgePermission).toBe('nobody')
  })

  it('updateSettings persists prayerWall.prayerReceiptsVisible=false and reads back', () => {
    const updated = updateSettings({ prayerWall: { prayerReceiptsVisible: false } })
    expect(updated.prayerWall.prayerReceiptsVisible).toBe(false)
    const fromStorage = getSettings()
    expect(fromStorage.prayerWall.prayerReceiptsVisible).toBe(false)
  })

  // --- Spec 6.3 — Night Mode default + back-compat migration ---

  it('DEFAULT_SETTINGS.prayerWall.nightMode === "auto"', () => {
    expect(DEFAULT_SETTINGS.prayerWall.nightMode).toBe('auto')
  })

  it('back-compat: pre-6.3 wr_settings (no nightMode key) injects nightMode="auto"', () => {
    // Pre-6.3 prayerWall shape with only prayerReceiptsVisible
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ prayerWall: { prayerReceiptsVisible: false } }),
    )
    const settings = getSettings()
    expect(settings.prayerWall.nightMode).toBe('auto')
    expect(settings.prayerWall.prayerReceiptsVisible).toBe(false)
  })

  // --- Spec 6.4 — 3am Watch default + back-compat migration ---

  it('DEFAULT_SETTINGS.prayerWall.watchEnabled === "off" (Gate-G-FAIL-CLOSED-OPT-IN)', () => {
    expect(DEFAULT_SETTINGS.prayerWall.watchEnabled).toBe('off')
  })

  it('back-compat: pre-6.4 wr_settings (no watchEnabled key) injects watchEnabled="off"', () => {
    // Pre-6.4 prayerWall shape with only prayerReceiptsVisible + nightMode
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        prayerWall: { prayerReceiptsVisible: true, nightMode: 'on' },
      }),
    )
    const settings = getSettings()
    expect(settings.prayerWall.watchEnabled).toBe('off')
    // Other prayerWall fields preserved
    expect(settings.prayerWall.nightMode).toBe('on')
    expect(settings.prayerWall.prayerReceiptsVisible).toBe(true)
  })
})
