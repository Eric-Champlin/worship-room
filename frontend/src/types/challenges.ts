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
}

export interface ChallengeProgress {
  joinedAt: string
  currentDay: number
  completedDays: number[]
  completedAt: string | null
}

export type ChallengeProgressMap = Record<string, ChallengeProgress>
