export type NudgePermission = 'everyone' | 'friends' | 'nobody'
export type StreakVisibility = 'everyone' | 'friends' | 'only_me'

// Spec 6.3 — Night Mode 3-state preference.
export type NightModePreference = 'auto' | 'on' | 'off'

/**
 * Spec 6.4 — 3am Watch 3-state preference.
 * 'off'  — Watch never activates (default; fail-closed).
 * 'auto' — Watch activates only when Night Mode is also active.
 * 'on'   — Watch activates whenever Watch hours [23..04] apply, independent of Night Mode.
 */
export type WatchPreference = 'off' | 'auto' | 'on'

export const DEFAULT_WATCH_PREFERENCE: WatchPreference = 'off'

export interface UserSettingsProfile {
  displayName: string
  avatarId: string
  avatarUrl?: string
  bio?: string
  email?: string
}

export interface UserSettingsNotifications {
  inAppNotifications: boolean
  pushNotifications: boolean
  emailWeeklyDigest: boolean
  emailMonthlyReport: boolean
  encouragements: boolean
  milestones: boolean
  friendRequests: boolean
  nudges: boolean
  weeklyRecap: boolean
}

export interface UserSettingsPrivacy {
  showOnGlobalLeaderboard: boolean
  activityStatus: boolean
  nudgePermission: NudgePermission
  streakVisibility: StreakVisibility
  blockedUsers: string[]
}

// Spec 6.1 — Prayer Wall settings namespace.
export interface UserSettingsPrayerWall {
  /**
   * Controls whether the author sees their own Prayer Receipt. Anti-pressure
   * design (W25): the off-state silently hides the receipt — no "you've hidden
   * X" copy. Default `true` per AC.
   */
  prayerReceiptsVisible: boolean
  /**
   * Spec 6.3 — Night Mode preference. 'auto' enables dimmed warm palette
   * between 21:00 and 05:59 browser-local time. 'on' / 'off' explicit
   * overrides. Default 'auto'.
   */
  nightMode: NightModePreference
  /**
   * Spec 6.4 — 3am Watch opt-in preference. Default 'off' (fail-closed).
   * Opting in (to 'auto' or 'on') requires the WatchOptInConfirmModal
   * confirmation; opting out is friction-free.
   */
  watchEnabled: WatchPreference
  /**
   * Spec 6.7 — One-time "irreversibility" warning dismissal for the
   * Share-as-image flow on testimony posts. `false` (default) = warning modal
   * shows on first share; `true` after user confirms = subsequent shares
   * skip the modal. Anti-pressure: silent default-off, no "you have not been
   * warned" copy anywhere.
   */
  dismissedShareWarning: boolean
}

export interface UserSettings {
  profile: UserSettingsProfile
  notifications: UserSettingsNotifications
  privacy: UserSettingsPrivacy
  prayerWall: UserSettingsPrayerWall
}
