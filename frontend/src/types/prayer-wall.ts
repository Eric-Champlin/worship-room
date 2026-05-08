import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PostType } from '@/constants/post-types'

// Spec 3.10 type, moved to constants/post-types.ts in Spec 4.1.
// Re-exported here for backward compatibility — existing imports of
// `PostType` from `@/types/prayer-wall` continue to resolve unchanged.
export type { PostType }

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
  // Spec 4.3 — testimony posts have category: null (no prayer-category for testimonies).
  // Other post types still set a category. Render-time consumers must guard for null.
  category: PrayerCategory | null
  challengeId?: string
  qotdId?: string
  isAnswered: boolean
  answeredText: string | null
  answeredAt: string | null
  createdAt: string
  lastActivityAt: string // for bump/sort
  prayingCount: number
  commentCount: number

  // --- Spec 3.10 (D5) — Phase 3.7+ fields. `postType` is required (flipped
  // in Phase 4.2 — Prayer Request Polish); the remaining fields are optional
  // and the mapper passes them through when present, so older call sites
  // that don't read them are unaffected.
  postType: PostType
  candleCount?: number
  bookmarkCount?: number
  updatedAt?: string
  scriptureReference?: string
  scriptureText?: string
  // --- Spec 4.4 — UUID of the comment marked as "Most helpful" by the question
  // author. Set only on resolved question posts; null/undefined otherwise.
  questionResolvedCommentId?: string
  // --- Intentionally NOT exposed:
  // - crisisFlag — server-side supersession only (Phase 3 Addendum #7)
  // - moderationStatus — server pre-filters; UI assumes 'approved'
  // - visibility — deferred until Phase 8 friend visibility
}

export interface PrayerComment {
  id: string
  prayerId: string
  userId: string
  authorName: string
  authorAvatarUrl: string | null
  content: string // may contain @mentions like "@Sarah"
  createdAt: string
  // --- Spec 4.4 — backend has been returning these since Phase 3; frontend now
  // consumes them. parentCommentId enables threading (deferred MPD-3).
  // isHelpful drives the inline ResolvedBadge on question post comments.
  // replies plumbs through nested children even though MVP renders flat.
  parentCommentId?: string
  isHelpful?: boolean
  replies?: PrayerComment[]
}

export interface PrayerReaction {
  prayerId: string
  isPraying: boolean
  isBookmarked: boolean
  isCandle: boolean
}
