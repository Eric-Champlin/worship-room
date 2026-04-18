export type ChallengeSeason = 'lent' | 'easter' | 'pentecost' | 'advent' | 'newyear'

export type ChallengeActionType = 'pray' | 'journal' | 'meditate' | 'music' | 'gratitude' | 'prayerWall'

export interface ChallengeScripture {
  reference: string
  text: string
}

export interface DayChallengeContent {
  dayNumber: number
  title: string
  scripture: ChallengeScripture
  reflection: string
  dailyAction: string
  actionType: ChallengeActionType
}

export interface Challenge {
  id: string
  title: string
  description: string
  season: ChallengeSeason
  getStartDate: (year: number) => Date
  durationDays: number
  icon: string
  themeColor: string
  dailyContent: DayChallengeContent[]
  communityGoal: string
  /** Pre-start: how many people have set a reminder. Used by CommunityFeed upcoming state. */
  remindersCount?: number
  /** Active: live participant count. If omitted, CommunityFeed hides the count line. */
  activeParticipantsCount?: number
  /** Completed: total finishers. If omitted, CommunityFeed defaults to 0. */
  completedCount?: number
}

export type ChallengeStatus = 'active' | 'completed' | 'paused' | 'abandoned'

export interface ChallengeProgress {
  joinedAt: string
  currentDay: number
  completedDays: number[]
  completedAt: string | null
  streak: number
  missedDays: number[]
  status: ChallengeStatus
  shownMilestones?: number[]
}

export type ChallengeProgressMap = Record<string, ChallengeProgress>
