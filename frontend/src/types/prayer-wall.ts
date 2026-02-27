export interface PrayerWallUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null // null = initials avatar
  bio: string
  joinedDate: string // ISO 8601
}

export interface PrayerRequest {
  id: string
  userId: string | null // null = anonymous
  authorName: string // "Anonymous" or first name
  authorAvatarUrl: string | null
  isAnonymous: boolean
  content: string
  isAnswered: boolean
  answeredText: string | null
  answeredAt: string | null
  createdAt: string
  lastActivityAt: string // for bump/sort
  prayingCount: number
  commentCount: number
}

export interface PrayerComment {
  id: string
  prayerId: string
  userId: string
  authorName: string
  authorAvatarUrl: string | null
  content: string // may contain @mentions like "@Sarah"
  createdAt: string
}

export interface PrayerReaction {
  prayerId: string
  isPraying: boolean
  isBookmarked: boolean
}
