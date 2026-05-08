/**
 * Prayer Wall response mappers — Spec 3.10.
 *
 * THREE pure functions that translate backend DTOs (from
 * `@/types/api/prayer-wall`) into frontend types (from `@/types/prayer-wall`):
 *
 *   1. postDtoToPrayerRequest(dto) — flattens nested author, drops crisisFlag /
 *      moderationStatus / visibility, preserves Phase 3.7+ optional fields per
 *      D5.
 *
 *   2. commentDtoToPrayerComment(dto) — flattens nested author, drops fields
 *      not consumed by the current PrayerComment type (parentCommentId,
 *      isHelpful, replies, crisisFlag, editedAt-equivalent).
 *
 *   3. reactionsResponseToReactionsMap(response) — unwraps the `reactions` key
 *      and produces exactly the `Record<string, {isPraying, isBookmarked,
 *      isCandle}>` shape that the wr_prayer_reactions store consumes
 *      (Phase 3 Addendum #10). Adds `prayerId` field per the existing
 *      PrayerReaction interface.
 *
 * Cross-author data leakage prevention: the array-mapping code (mapPostDtos)
 * uses Array.prototype.map (per-DTO closure), NEVER a shared accumulator.
 * Tests in postMappers.test.ts include a 5-distinct-author fixture verifying
 * each output PrayerRequest matches its input by id.
 */

import type {
  PostDto,
  CommentDto,
  ReactionsResponseApi,
  PostCategoryApi,
} from '@/types/api/prayer-wall'
import type {
  PrayerRequest,
  PrayerComment,
  PrayerReaction,
  PostType,
} from '@/types/prayer-wall'
import type { PrayerCategory } from '@/constants/prayer-categories'

/**
 * Translates a backend PostDto into a frontend PrayerRequest.
 *
 * Field-by-field decisions:
 *   - id, content, isAnonymous, isAnswered, answeredText, answeredAt,
 *     createdAt, lastActivityAt, prayingCount, commentCount → pass through.
 *   - author.id          → userId (null for anonymous posts)
 *   - author.displayName → authorName
 *   - author.avatarUrl   → authorAvatarUrl
 *   - category           → null falls back to 'other' (PrayerCategory has no
 *                          null member; defensive default).
 *   - challengeId, qotdId → optional pass-through (skip when null)
 *   - postType, candleCount, bookmarkCount, updatedAt, scriptureReference,
 *     scriptureText → optional pass-through per D5
 *   - crisisFlag, moderationStatus, visibility → DROPPED (D6, D5 comment block)
 */
export function postDtoToPrayerRequest(dto: PostDto): PrayerRequest {
  const result: PrayerRequest = {
    id: dto.id,
    userId: dto.author.id,
    authorName: dto.author.displayName,
    authorAvatarUrl: dto.author.avatarUrl,
    isAnonymous: dto.isAnonymous,
    content: dto.content,
    category: mapCategory(dto.category),
    isAnswered: dto.isAnswered,
    answeredText: dto.answeredText,
    answeredAt: dto.answeredAt,
    createdAt: dto.createdAt,
    lastActivityAt: dto.lastActivityAt,
    prayingCount: dto.prayingCount,
    commentCount: dto.commentCount,
    postType: dto.postType as PostType,
    candleCount: dto.candleCount,
    bookmarkCount: dto.bookmarkCount,
    updatedAt: dto.updatedAt,
  }
  if (dto.challengeId !== null && dto.challengeId !== undefined) {
    result.challengeId = dto.challengeId
  }
  if (dto.qotdId !== null && dto.qotdId !== undefined) {
    result.qotdId = dto.qotdId
  }
  if (dto.scriptureReference !== null && dto.scriptureReference !== undefined) {
    result.scriptureReference = dto.scriptureReference
  }
  if (dto.scriptureText !== null && dto.scriptureText !== undefined) {
    result.scriptureText = dto.scriptureText
  }
  if (dto.questionResolvedCommentId !== null && dto.questionResolvedCommentId !== undefined) {
    result.questionResolvedCommentId = dto.questionResolvedCommentId
  }
  return result
}

/**
 * Maps an array of PostDtos to PrayerRequests, preserving order. Uses
 * Array.prototype.map (per-DTO closure) — NO shared accumulator, NO
 * cross-author state leakage.
 */
export function mapPostDtos(dtos: PostDto[]): PrayerRequest[] {
  return dtos.map(postDtoToPrayerRequest)
}

/**
 * Translates a backend CommentDto into a frontend PrayerComment.
 *
 * Field-by-field decisions:
 *   - id, content, createdAt → pass through
 *   - postId             → prayerId (frontend nomenclature)
 *   - author.id          → userId. NB: backend's CommentDto requires authenticated
 *                          author (no null user UUID for comments — only posts can
 *                          be anonymous). If author.id IS null (defensive), we
 *                          coerce to '' to match the existing PrayerComment shape's
 *                          `userId: string` (NOT nullable).
 *   - author.displayName → authorName
 *   - author.avatarUrl   → authorAvatarUrl
 *   - parentCommentId, isHelpful, replies, crisisFlag, moderationStatus,
 *     updatedAt → DROPPED (PrayerComment doesn't expose them today; Phase 4.4
 *     introduces threading)
 */
export function commentDtoToPrayerComment(dto: CommentDto): PrayerComment {
  const result: PrayerComment = {
    id: dto.id,
    prayerId: dto.postId,
    userId: dto.author.id ?? '',
    authorName: dto.author.displayName,
    authorAvatarUrl: dto.author.avatarUrl,
    content: dto.content,
    createdAt: dto.createdAt,
  }
  // Spec 4.4 — plumb the previously-dropped backend fields. Only populated when
  // the backend supplies them (defensive null/undefined check). MPD-3 keeps
  // visual threading deferred — the mapper plumbs the data so the type matches
  // the API contract; rendering stays flat until the threading follow-up ships.
  if (dto.parentCommentId !== null && dto.parentCommentId !== undefined) {
    result.parentCommentId = dto.parentCommentId
  }
  if (typeof dto.isHelpful === 'boolean') {
    result.isHelpful = dto.isHelpful
  }
  if (Array.isArray(dto.replies) && dto.replies.length > 0) {
    result.replies = dto.replies.map(commentDtoToPrayerComment)
  }
  return result
}

/** Array form of commentDtoToPrayerComment (preserves order). */
export function mapCommentDtos(dtos: CommentDto[]): PrayerComment[] {
  return dtos.map(commentDtoToPrayerComment)
}

/**
 * Translates the backend's ReactionsResponse envelope (`{reactions: Record}`)
 * into the canonical `wr_prayer_reactions` shape (`Record<string,
 * {prayerId, isPraying, isBookmarked, isCandle}>`).
 *
 * Each entry includes the prayerId (per the existing PrayerReaction interface).
 * Defensive: if a backend value is missing isCandle (shouldn't happen post-3.7,
 * but legacy data is forgiving), defaults to false.
 *
 * Phase 3 Addendum #10 verification: field names are exactly `isPraying`,
 * `isBookmarked`, `isCandle` (NOT `praying`, `bookmarked`, `candle`).
 */
export function reactionsResponseToReactionsMap(
  response: ReactionsResponseApi,
): Record<string, PrayerReaction> {
  const out: Record<string, PrayerReaction> = {}
  if (!response || typeof response !== 'object' || !response.reactions) {
    return out
  }
  for (const [postId, perPost] of Object.entries(response.reactions)) {
    out[postId] = {
      prayerId: postId,
      isPraying: Boolean(perPost?.isPraying),
      isBookmarked: Boolean(perPost?.isBookmarked),
      isCandle: Boolean((perPost as { isCandle?: boolean })?.isCandle),
    }
  }
  return out
}

// --- Internals ---

/**
 * Defensive category mapper. Backend's PostDto.category is `PostCategoryApi |
 * null` (per OpenAPI). Frontend's PrayerRequest.category is `PrayerCategory`
 * (non-null). For posts where the backend returns null (legitimate per the
 * post_type='question' / 'discussion' rows), we fall back to 'other'.
 *
 * In practice, prayer-request posts always have a category; the null-category
 * case only occurs for non-prayer post types (Phase 4 territory). 'other' is
 * the most neutral fallback in the existing PrayerCategory union.
 */
function mapCategory(value: PostCategoryApi | null): PrayerCategory {
  if (value === null) return 'other'
  // PostCategoryApi values are all valid PrayerCategory values (verified at recon).
  return value as PrayerCategory
}
