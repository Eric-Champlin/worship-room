import { useState, useCallback, useEffect } from 'react'
import type { UserSettings, UserSettingsProfile, UserSettingsNotifications, UserSettingsPrivacy, UserSettingsPrayerWall, UserSettingsVerseFindsYou, UserSettingsPresence } from '@/types/settings'
import { getSettings, saveSettings, SETTINGS_KEY } from '@/services/settings-storage'
import { getStoredToken } from '@/lib/auth-storage'
import { patchCurrentUser } from '@/services/auth-service'

export function useSettings(): {
  settings: UserSettings
  updateProfile: (updates: Partial<UserSettingsProfile>) => void
  updateNotifications: (key: keyof UserSettingsNotifications, value: boolean) => void
  updatePrivacy: (updates: Partial<Omit<UserSettingsPrivacy, 'blockedUsers'>>) => void
  unblockUser: (userId: string) => void
  updatePrayerWall: (updates: Partial<UserSettingsPrayerWall>) => void
  updateVerseFindsYou: (updates: Partial<UserSettingsVerseFindsYou>) => void
  updatePresence: (updates: Partial<UserSettingsPresence>) => void
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

  // Spec 6.8 — Verse-Finds-You namespace updater (top-level).
  const updateVerseFindsYou = useCallback((updates: Partial<UserSettingsVerseFindsYou>) => {
    setSettings((prev) => {
      const next = { ...prev, verseFindsYou: { ...prev.verseFindsYou, ...updates } }
      saveSettings(next)
      return next
    })
  }, [])

  // Spec 6.11b — Live Presence namespace updater. localStorage write is the
  // user-visible source of truth for the toggle UI; backend PATCH is fire-and-forget
  // for the count-exclusion filter. Failure leaves localStorage updated and logs a
  // warning — next toggle re-attempts.
  const updatePresence = useCallback((updates: Partial<UserSettingsPresence>) => {
    setSettings((prev) => {
      const next = { ...prev, presence: { ...prev.presence, ...updates } }
      saveSettings(next)
      return next
    })
    // Backend mirror — only when the user is authenticated and only when the
    // optedOut field is part of the update.
    if (typeof updates.optedOut === 'boolean' && getStoredToken()) {
      void patchCurrentUser({ presenceOptedOut: updates.optedOut }).catch((err) => {
        console.warn('presence opt-out backend sync failed', err)
      })
    }
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

  return { settings, updateProfile, updateNotifications, updatePrivacy, unblockUser, updatePrayerWall, updateVerseFindsYou, updatePresence }
}
