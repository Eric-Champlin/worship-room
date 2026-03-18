import { useState, useCallback, useEffect } from 'react'
import type { UserSettings, UserSettingsProfile, UserSettingsNotifications, UserSettingsPrivacy } from '@/types/settings'
import { getSettings, saveSettings, SETTINGS_KEY } from '@/services/settings-storage'

export function useSettings() {
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

  return { settings, updateProfile, updateNotifications, updatePrivacy, unblockUser }
}
