export type NudgePermission = 'everyone' | 'friends' | 'nobody'
export type StreakVisibility = 'everyone' | 'friends' | 'only_me'

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
}

export interface UserSettings {
  profile: UserSettingsProfile
  notifications: UserSettingsNotifications
  privacy: UserSettingsPrivacy
  prayerWall: UserSettingsPrayerWall
}
