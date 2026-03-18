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

export interface UserSettings {
  profile: UserSettingsProfile
  notifications: UserSettingsNotifications
  privacy: UserSettingsPrivacy
}
