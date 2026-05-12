import { useState, useCallback, useEffect } from 'react'
import type { UserSettings, UserSettingsProfile, UserSettingsNotifications, UserSettingsPrivacy, UserSettingsPrayerWall } from '@/types/settings'
import { getSettings, saveSettings, SETTINGS_KEY } from '@/services/settings-storage'

export function useSettings(): {
  settings: UserSettings
  updateProfile: (updates: Partial<UserSettingsProfile>) => void
  updateNotifications: (key: keyof UserSettingsNotifications, value: boolean) => void
  updatePrivacy: (updates: Partial<Omit<UserSettingsPrivacy, 'blockedUsers'>>) => void
  unblockUser: (userId: string) => void
  updatePrayerWall: (updates: Partial<UserSettingsPrayerWall>) => void
} {
  const [settings, setSettings] = useState<UserSettings>(() => getSettings())

  const updateProfile = useCallback((updates: Partial<UserSettingsProfile>) => {
    setSettings((prev) => {
      const next = { ...prev, profile: { ...prev.profile, ...updates } }
      saveSettings(next)
      return next
    })
  }, [])

  const updateNotifications = useCallback((key: keyof UserSettingsNotifications, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, notifications: { ...prev.notifications, [key]: value } }
      saveSettings(next)
      return next
    })
  }, [])

  const updatePrivacy = useCallback((updates: Partial<Omit<UserSettingsPrivacy, 'blockedUsers'>>) => {
    setSettings((prev) => {
      const next = { ...prev, privacy: { ...prev.privacy, ...updates } }
      saveSettings(next)
      return next
    })
  }, [])

  const unblockUser = useCallback((userId: string) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        privacy: {
          ...prev.privacy,
          blockedUsers: prev.privacy.blockedUsers.filter((id) => id !== userId),
        },
      }
      saveSettings(next)
      return next
    })
  }, [])

  // Spec 6.1 — Prayer Wall settings namespace updater.
  const updatePrayerWall = useCallback((updates: Partial<UserSettingsPrayerWall>) => {
    setSettings((prev) => {
      const next = { ...prev, prayerWall: { ...prev.prayerWall, ...updates } }
      saveSettings(next)
      return next
    })
  }, [])

  // Cross-tab sync
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === SETTINGS_KEY) {
        setSettings(getSettings())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return { settings, updateProfile, updateNotifications, updatePrivacy, unblockUser, updatePrayerWall }
}
