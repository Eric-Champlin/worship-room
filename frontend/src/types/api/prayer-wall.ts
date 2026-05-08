/**
 * Prayer Wall API DTOs — Spec 3.10 (Frontend Service API Implementations).
 *
 * Hand-authored from backend/src/main/resources/openapi.yaml (PostDto, CommentDto,
 * PostListResponse, CommentListResponse, ReactionsResponse, ToggleReactionResponse,
 * BookmarkResponse, QotdQuestionResponse, CreatePostRequest, UpdatePostRequest,
 * CreateCommentRequest, UpdateCommentRequest, ToggleReactionRequest, AuthorDto,
 * PostListMeta).
 *
 * When the openapi-typescript pipeline ships, this file regenerates and the
 * imports in services/api/prayer-wall-api.ts and lib/prayer-wall/postMappers.ts
 * remain stable. Same convention as types/api/friends.ts (Spec 2.5.3).
 *
 * DO NOT add fields the OpenAPI spec doesn't declare.
 * DO NOT use these types in components — components consume the legacy
 *  `PrayerRequest` / `PrayerComment` from `@/types/prayer-wall` after mapping.
 */

export type PostTypeApi =
  | 'prayer_request'
  | 'testimony'
  | 'question'
  | 'discussion'
  | 'encouragement'

export type PostCategoryApi =
  | 'health'
  | 'mental-health'
  | 'family'
  | 'work'
  | 'grief'
  | 'gratitude'
  | 'praise'
  | 'relationships'
  | 'other'
  | 'discussion'

export type PostVisibilityApi = 'public' | 'friends' | 'private'

export type ModerationStatusApi = 'approved' | 'flagged' | 'hidden' | 'removed'

export type ReactionTypeApi = 'praying' | 'candle'

export type ToggleStateApi = 'added' | 'removed'

export type FeedSortApi = 'bumped' | 'recent' | 'answered'

export type AuthorPostsSortApi = 'bumped' | 'recent' | 'answered'

export type QotdThemeApi =
  | 'faith_journey'
  | 'practical'
  | 'reflective'
  | 'encouraging'
  | 'community'
  | 'seasonal'

export interface AuthorDto {
  /** Author user UUID; null for anonymous posts (per OpenAPI: rendered as "id": null, NOT omitted). */
  id: string | null
  /** Resolved display name per the user's display_name_preference. Always "Anonymous" for anonymous posts. */
  displayName: string
  /** User avatar URL; null for anonymous posts or users with no avatar. */
  avatarUrl: string | null
}

export interface PostDto {
  id: string
  postType: PostTypeApi
  content: string
  category: PostCategoryApi | null
  isAnonymous: boolean
  challengeId: string | null
  qotdId: string | null
  scriptureReference: string | null
  scriptureText: string | null
  visibility: PostVisibilityApi
  isAnswered: boolean
  answeredText: string | null
  answeredAt: string | null
  moderationStatus: ModerationStatusApi
  crisisFlag: boolean
  prayingCount: number
  candleCount: number
  commentCount: number
  bookmarkCount: number
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  author: AuthorDto
  /** Spec 4.4 — UUID of the comment marked as "Most helpful" by the question's author. Null on non-question posts and unresolved questions. */
  questionResolvedCommentId: string | null
}

export interface PostListMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  requestId: string
}

/**
 * Raw envelope returned by GET /api/v1/posts and friends. apiFetch strips
 * the outer envelope and returns this structure as-is (since this endpoint's
 * meta is non-standard — not just `{requestId}`).
 *
 * NOTE: apiFetch in @/lib/api-client returns body.data for the standard
 * `{data, meta:{requestId}}` envelope. For PostListResponse the response
 * is `{data: PostDto[], meta: PostListMeta}` — apiFetch returns the
 * `PostDto[]` array. The pagination metadata is in the `meta` block, which
 * apiFetch does NOT expose. See Step 6 for how prayer-wall-api recovers
 * pagination metadata via a small wrapper around fetch (NOT apiFetch) for
 * paginated read endpoints.
 */
export interface PostListResponseRaw {
  data: PostDto[]
  meta: PostListMeta
}

export interface CommentDto {
  id: string
  postId: string
  parentCommentId: string | null
  content: string
  isHelpful: boolean
  moderationStatus: 'approved' | 'flagged'
  crisisFlag: boolean
  createdAt: string
  updatedAt: string
  author: AuthorDto
  replies: CommentDto[]
}

export interface CommentListResponseRaw {
  data: CommentDto[]
  meta: PostListMeta
}

export interface PerPostReactionApi {
  isPraying: boolean
  isCandle: boolean
  isBookmarked: boolean
}

export interface ReactionsResponseApi {
  /** Map of post UUID strings to PerPostReactionApi values. */
  reactions: Record<string, PerPostReactionApi>
}

export interface ToggleReactionRequest {
  reactionType: ReactionTypeApi
}

export interface ToggleReactionResponse {
  reactionType: ReactionTypeApi
  state: ToggleStateApi
  prayingCount: number
  candleCount: number
}

export interface BookmarkResponse {
  bookmarked: boolean
  bookmarkCount: number
}

export interface QotdQuestionResponse {
  id: string
  text: string
  theme: QotdThemeApi
  hint: string | null
}

export interface CreatePostRequest {
  postType: PostTypeApi
  content: string
  category?: PostCategoryApi | null
  isAnonymous?: boolean
  visibility?: PostVisibilityApi
  challengeId?: string | null
  qotdId?: string | null
  scriptureReference?: string | null
  scriptureText?: string | null
}

export interface CrisisResource {
  name: string
  phone: string | null
  text: string | null
  link: string
}

export interface CrisisResourcesBlock {
  message: string
  resources: CrisisResource[]
}

/**
 * Response from POST /api/v1/posts. The optional `crisisResources` block sits
 * at the response root parallel to `data` when the post tripped the backend's
 * crisis-keyword detector.
 *
 * **This type is defined for OpenAPI fidelity, not for runtime consumption.**
 * `apiFetch` (in `@/lib/api-client`) strips the standard `{data, meta}`
 * envelope and returns `body.data` — the `crisisResources` block at the
 * envelope root is therefore invisible to `services/api/prayer-wall-api.ts`'s
 * `createPost` function. That is intentional: Universal Rule 13 (Crisis
 * detection supersession) and Phase 3 Addendum #7 (`CrisisAlertService` is
 * the unified entry) place crisis handling on three layers that do NOT
 * depend on the frontend reading this block:
 *
 *   1. Server-side: `CrisisAlertService` flags the post on insert and emails
 *      the admin queue. The post is still returned from the feed (per
 *      `PostSpecifications` recon — moderation_status filter only, NOT
 *      crisis_flag). Anti-pressure design — surface resources, do NOT hide.
 *   2. Client-side detection: `constants/crisis-resources.ts` ships
 *      `containsCrisisKeyword(text)` which the composer surface (Pray, Journal,
 *      Prayer Wall) calls BEFORE submission to render the `CrisisBanner`.
 *   3. Mapper layer: `postDtoToPrayerRequest` drops `crisisFlag` from the
 *      output `PrayerRequest`, so no UI conditional can ever leak via
 *      mapped data.
 *
 * If a future spec needs the envelope-root block (e.g., to surface the
 * server's authoritative crisis-resource list when the client-side keyword
 * detector misses), the consumer should call a non-stripping wrapper (similar
 * to `apiFetchWithMeta` in `prayer-wall-api.ts`) rather than reshaping
 * `apiFetch`. The type stays here so that wrapper has a contract to return.
 *
 * Removing this field would silently drift our type definitions away from
 * the OpenAPI contract — kept deliberately as a faithful mirror.
 */
export interface CreatePostResponseRaw {
  data: PostDto
  crisisResources?: CrisisResourcesBlock
  meta: { requestId: string }
}

export interface UpdatePostRequest {
  content?: string
  category?: PostCategoryApi
  visibility?: PostVisibilityApi
  isAnswered?: boolean
  answeredText?: string
  challengeId?: string
  qotdId?: string
  scriptureReference?: string
  scriptureText?: string
}

export interface CreateCommentRequest {
  content: string
  parentCommentId?: string | null
}

export interface UpdateCommentRequest {
  content: string
}

export interface ResolveQuestionRequest {
  /** UUID of the comment to mark as "Most helpful" on a question post. */
  commentId: string
}
