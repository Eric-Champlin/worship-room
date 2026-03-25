import type { UserSettings } from '@/types/settings'

export const SETTINGS_KEY = 'wr_settings'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    displayName: '',
    avatarId: 'default',
    bio: '',
    email: 'user@example.com',
  },
  notifications: {
    inAppNotifications: true,
    pushNotifications: false,
    emailWeeklyDigest: true,
    emailMonthlyReport: true,
    encouragements: true,
    milestones: true,
    friendRequests: true,
    nudges: true,
    weeklyRecap: true,
  },
  privacy: {
    showOnGlobalLeaderboard: true,
    activityStatus: true,
    nudgePermission: 'friends',
    streakVisibility: 'friends',
    blockedUsers: [],
  },
}

function deepMerge<T extends object>(defaults: T, partial: DeepPartial<T>): T {
  const result = { ...defaults } as Record<string, unknown>
  const defaultsRecord = defaults as Record<string, unknown>
  for (const key of Object.keys(defaultsRecord)) {
    const defaultVal = defaultsRecord[key]
    const partialVal = (partial as Record<string, unknown>)[key]
    if (partialVal === undefined) continue
    if (
      defaultVal !== null &&
      typeof defaultVal === 'object' &&
      !Array.isArray(defaultVal) &&
      partialVal !== null &&
      typeof partialVal === 'object' &&
      !Array.isArray(partialVal)
    ) {
      result[key] = deepMerge(
        defaultVal as Record<string, unknown>,
        partialVal as DeepPartial<Record<string, unknown>>,
      )
    } else {
      result[key] = partialVal
    }
  }
  return result as T
}

export function getSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw === null) return { ...DEFAULT_SETTINGS, profile: { ...DEFAULT_SETTINGS.profile }, notifications: { ...DEFAULT_SETTINGS.notifications }, privacy: { ...DEFAULT_SETTINGS.privacy, blockedUsers: [...DEFAULT_SETTINGS.privacy.blockedUsers] } }
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS, profile: { ...DEFAULT_SETTINGS.profile }, notifications: { ...DEFAULT_SETTINGS.notifications }, privacy: { ...DEFAULT_SETTINGS.privacy, blockedUsers: [...DEFAULT_SETTINGS.privacy.blockedUsers] } }
    }
    return deepMerge(DEFAULT_SETTINGS, parsed)
  } catch {
    return { ...DEFAULT_SETTINGS, profile: { ...DEFAULT_SETTINGS.profile }, notifications: { ...DEFAULT_SETTINGS.notifications }, privacy: { ...DEFAULT_SETTINGS.privacy, blockedUsers: [...DEFAULT_SETTINGS.privacy.blockedUsers] } }
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // localStorage unavailable — degrade gracefully
  }
}

export function updateSettings(partial: DeepPartial<UserSettings>): UserSettings {
  const current = getSettings()
  const updated = deepMerge(current, partial) as UserSettings
  saveSettings(updated)
  return updated
}
