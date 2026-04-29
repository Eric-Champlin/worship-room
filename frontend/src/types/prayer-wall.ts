import type { PrayerCategory } from '@/constants/prayer-categories'

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
  category: PrayerCategory
  challengeId?: string
  qotdId?: string
  isAnswered: boolean
  answeredText: string | null
  answeredAt: string | null
  createdAt: string
  lastActivityAt: string // for bump/sort
  prayingCount: number
  commentCount: number

  // --- Spec 3.10 (D5) — optional Phase 3.7+ fields. Mapper passes through
  // when present; older call sites that don't read them are unaffected.
  // Phase 4.1 (Post Type Foundation) will make `postType` required.
  postType?: PostType
  candleCount?: number
  bookmarkCount?: number
  updatedAt?: string
  scriptureReference?: string
  scriptureText?: string
  // --- Intentionally NOT exposed:
  // - crisisFlag — server-side supersession only (Phase 3 Addendum #7)
  // - moderationStatus — server pre-filters; UI assumes 'approved'
  // - visibility — deferred until Phase 8 friend visibility
}

/** Spec 3.10 — discriminator for the unified posts table (Decision 4). */
export type PostType =
  | 'prayer_request'
  | 'testimony'
  | 'question'
  | 'discussion'
  | 'encouragement'

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
  isCandle: boolean
}
