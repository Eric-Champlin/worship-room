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
  prayerWall: {
    // Spec 6.1 — Prayer Receipt visible by default. Author can turn it off
    // in /settings?tab=privacy (no shaming copy on off-state).
    prayerReceiptsVisible: true,
    // Spec 6.3 — Night Mode default 'auto' so night users discover the
    // feature ambiently; day users see no difference.
    nightMode: 'auto',
    // Spec 6.4 — 3am Watch opt-in default. NEVER auto-enable (Gate-G-FAIL-CLOSED-OPT-IN).
    // Users must explicitly opt in via Settings; opt-in requires confirmation modal.
    watchEnabled: 'off',
    // Spec 6.7 — Share-as-image warning is sticky-on-confirm. Default false so
    // first-time sharers see the irreversibility modal; once confirmed, the
    // modal does not re-appear.
    dismissedShareWarning: false,
  },
  verseFindsYou: {
    // Spec 6.8 — Verse-Finds-You default OFF for new AND existing users
    // (Gate-G-DEFAULT-OFF). deepMerge below propagates this default to any
    // pre-existing wr_settings localStorage entry that lacks the namespace,
    // satisfying W27 (existing users land on false). Toggle exposed in the
    // Settings → Gentle extras section.
    enabled: false,
  },
  presence: {
    // Spec 6.11b — Live Presence opt-out default false (user is counted by
    // default per Gate-G-DEFAULT-ON-FOR-COUNTING). Toggle in Settings →
    // Gentle extras flips this to true. Mirrored to backend via PATCH /users/me.
    optedOut: false,
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
      return { ...DEFAULT_SETTINGS, profile: { ...DEFAULT_SETTINGS.profile }, notifications: { ...DEFAULT_SETTINGS.notifications }, privacy: { ...DEFAULT_SETTINGS.privacy, blockedUsers: [...DEFAULT_SETTINGS.privacy.blockedUsers] }, prayerWall: { ...DEFAULT_SETTINGS.prayerWall }, verseFindsYou: { ...DEFAULT_SETTINGS.verseFindsYou }, presence: { ...DEFAULT_SETTINGS.presence } }
    }
    return deepMerge(DEFAULT_SETTINGS, parsed)
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return { ...DEFAULT_SETTINGS, profile: { ...DEFAULT_SETTINGS.profile }, notifications: { ...DEFAULT_SETTINGS.notifications }, privacy: { ...DEFAULT_SETTINGS.privacy, blockedUsers: [...DEFAULT_SETTINGS.privacy.blockedUsers] }, prayerWall: { ...DEFAULT_SETTINGS.prayerWall }, verseFindsYou: { ...DEFAULT_SETTINGS.verseFindsYou }, presence: { ...DEFAULT_SETTINGS.presence } }
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (_e) {
    // localStorage may be unavailable
  }
}

export function updateSettings(partial: DeepPartial<UserSettings>): UserSettings {
  const current = getSettings()
  const updated = deepMerge(current, partial) as UserSettings
  saveSettings(updated)
  return updated
}
