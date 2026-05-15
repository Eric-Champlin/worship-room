/**
 * Prayer Wall API client — Spec 3.10 (Frontend Service API Implementations).
 *
 * Read-swap implementation backing the `isBackendPrayerWallEnabled()` flag.
 * Function-per-endpoint, thin apiFetch wrappers, returns frontend-shaped types
 * via mappers. Mirrors `services/api/friends-api.ts` shape (Spec 2.5.4).
 *
 * Authorization header is attached automatically by apiFetch from auth-storage.
 *
 * Read functions cache successful responses in a module-lifetime
 * Map<string, {data, fetchedAt}> keyed by URL+params (D7). On NETWORK_ERROR
 * the read functions consult the cache; on cache miss the error rethrows.
 * No localStorage / IndexedDB persistence — IndexedDB is Spec 16.1b.
 *
 * NOTE: PostListResponse and CommentListResponse have a non-standard envelope
 * `{data: T[], meta: PostListMeta}` where `meta` carries pagination. apiFetch
 * returns body.data only (the array); to recover pagination metadata, the
 * paginated read functions issue a parallel native fetch via `apiFetchWithMeta`
 * (defined inline below) that surfaces both data and meta.
 */

import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import { getStoredToken } from '@/lib/auth-storage'
import { AnonymousWriteAttemptError } from '@/lib/prayer-wall/apiErrors'
import {
  postDtoToPrayerRequest,
  commentDtoToPrayerComment,
  mapPostDtos,
  mapCommentDtos,
  reactionsResponseToReactionsMap,
} from '@/lib/prayer-wall/postMappers'
import {
  hasAnyCrisisFlag,
  isCrisisFlagged,
} from '@/lib/prayer-wall/crisisFlagDetection'
import type {
  PostDto,
  CommentDto,
  PostListMeta,
  ReactionsResponseApi,
  QotdQuestionResponse,
  PostTypeApi,
  ReactionTypeApi,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  ToggleReactionRequest,
  ToggleReactionResponse,
  BookmarkResponse,
} from '@/types/api/prayer-wall'
import type {
  PrayerRequest,
  PrayerComment,
  PrayerReaction,
} from '@/types/prayer-wall'

// --- Pagination shapes returned to consumers ---

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface PostListResult {
  posts: PrayerRequest[]
  pagination: PaginationInfo
  /**
   * Spec 6.11b — Gate-G-CRISIS-SUPPRESSION. True if any post in the raw DTO
   * response had `crisisFlag: true` BEFORE the mapper stripped it. Drives
   * the PresenceIndicator suppression at the page level. The mapper continues
   * to drop `crisisFlag` from `PrayerRequest` per Phase 3 Addendum #7; this
   * is the canonical alternative read path.
   */
  hasCrisisFlag: boolean
}

export interface SinglePostResult {
  /** Spec 6.11b — surfaces `crisisFlag` from the raw DTO so single-post pages can suppress the indicator. */
  prayer: PrayerRequest
  crisisFlag: boolean
}

export interface CommentListResult {
  comments: PrayerComment[]
  pagination: PaginationInfo
}

// --- Module-lifetime read cache (D7) ---

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const readCache = new Map<string, CacheEntry<unknown>>()

function cacheGet<T>(key: string): T | undefined {
  const entry = readCache.get(key) as CacheEntry<T> | undefined
  return entry?.data
}

function cacheSet<T>(key: string, data: T): void {
  readCache.set(key, { data, fetchedAt: Date.now() })
}

/** Test-only: clears the read cache so each test starts in a known state. */
export function _resetReadCacheForTesting(): void {
  readCache.clear()
}

// --- Helpers for paginated endpoints (recover meta from non-standard envelope) ---

/**
 * Issues a fetch that surfaces both `data` and `meta` from the
 * `{data: T[], meta: PostListMeta}` envelope used by paginated post / comment
 * endpoints. Mirrors apiFetch's auth + 401 handling but does NOT strip the
 * `data` field — it returns the parsed envelope as-is so the caller can read
 * `meta.totalCount` / `meta.hasNextPage`.
 *
 * Same auth + timeout + 401 behavior as apiFetch.
 */
async function apiFetchWithMeta<T, M>(
  path: string,
  options: { method?: string; signal?: AbortSignal } = {},
): Promise<{ data: T; meta: M }> {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const url = path.startsWith('http') ? path : `${base}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getStoredToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      signal: options.signal ?? controller.signal,
    })
  } catch {
    clearTimeout(timer)
    throw new ApiError('NETWORK_ERROR', 0, 'Unable to reach the server.', null)
  }
  clearTimeout(timer)
  if (!response.ok) {
    const text = await response.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      /* not JSON */
    }
    const errBody = (body ?? {}) as Record<string, unknown>
    const code = typeof errBody.code === 'string' ? errBody.code : 'UNKNOWN'
    const message =
      typeof errBody.message === 'string'
        ? errBody.message
        : text || response.statusText
    const requestId =
      typeof errBody.requestId === 'string' ? errBody.requestId : null
    if (response.status === 401) {
      // Mirror apiFetch's 401 handling — clear token + dispatch wr:auth-invalidated.
      // (Imported lazily to avoid a circular dependency with auth-storage at module load.)
      const { clearStoredToken } = await import('@/lib/auth-storage')
      clearStoredToken()
      try {
        window.dispatchEvent(new CustomEvent('wr:auth-invalidated'))
      } catch {
        /* no-op in SSR / test environments */
      }
    }
    throw new ApiError(code, response.status, message, requestId)
  }
  const text = await response.text()
  if (!text) {
    throw new ApiError(
      'INVALID_RESPONSE',
      response.status,
      'Empty response body for paginated endpoint',
      null,
    )
  }
  return JSON.parse(text) as { data: T; meta: M }
}

function metaToPagination(meta: PostListMeta): PaginationInfo {
  return {
    page: meta.page,
    limit: meta.limit,
    total: meta.totalCount,
    hasMore: meta.hasNextPage,
  }
}

// --- READ functions ---

export interface ListPostsParams {
  page: number
  limit: number
  category?: string
  postType?: PostTypeApi
  qotdId?: string
  /** Spec 6.6 added 'answered' for the Answered Wall feed. Filters
   *  is_answered=TRUE posts and sorts by answered_at DESC. Backend infra
   *  (SortKey.ANSWERED + PostSpecifications.isAnswered) has shipped since
   *  Phase 3; 6.6 is a frontend consumer of the existing endpoint. */
  sort?: 'bumped' | 'recent' | 'answered'
}

/** GET /api/v1/posts — paginated public feed (optional auth). */
export async function listPosts(
  params: ListPostsParams,
): Promise<PostListResult> {
  const url = buildListPostsUrl(params)
  const cacheKey = `GET ${url}`
  try {
    const env = await apiFetchWithMeta<PostDto[], PostListMeta>(url)
    const result: PostListResult = {
      posts: mapPostDtos(env.data),
      pagination: metaToPagination(env.meta),
      // Spec 6.11b — derive crisis-flag presence from raw DTOs BEFORE mapper strip.
      hasCrisisFlag: hasAnyCrisisFlag(env.data),
    }
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<PostListResult>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

function buildListPostsUrl(params: ListPostsParams): string {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('limit', String(params.limit))
  if (params.category) search.set('category', params.category)
  if (params.postType) search.set('postType', params.postType)
  if (params.qotdId) search.set('qotdId', params.qotdId)
  if (params.sort) search.set('sort', params.sort)
  return `/api/v1/posts?${search.toString()}`
}

/** GET /api/v1/posts/{id} — single post (optional auth). */
export async function getPostById(id: string): Promise<PrayerRequest> {
  const url = `/api/v1/posts/${encodeURIComponent(id)}`
  const cacheKey = `GET ${url}`
  try {
    const dto = await apiFetch<PostDto>(url)
    const result = postDtoToPrayerRequest(dto)
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<PrayerRequest>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

/**
 * Spec 6.11b — sibling to {@link getPostById} that also surfaces `crisisFlag`
 * from the raw DTO so PrayerDetail can suppress the PresenceIndicator on a
 * flagged post. The mapper continues to strip `crisisFlag` from `PrayerRequest`
 * (Phase 3 Addendum #7); this helper exposes both pieces independently.
 */
export async function getPostByIdWithCrisisFlag(id: string): Promise<SinglePostResult> {
  const url = `/api/v1/posts/${encodeURIComponent(id)}`
  const cacheKey = `GET ${url}+crisis`
  try {
    const dto = await apiFetch<PostDto>(url)
    const result: SinglePostResult = {
      prayer: postDtoToPrayerRequest(dto),
      crisisFlag: isCrisisFlagged(dto),
    }
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<SinglePostResult>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

export interface ListAuthorPostsParams {
  page: number
  limit: number
  sort?: 'bumped' | 'recent'
}

/** GET /api/v1/users/{username}/posts — paginated; default sort='recent'. */
export async function listAuthorPosts(
  username: string,
  params: ListAuthorPostsParams,
): Promise<PostListResult> {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('limit', String(params.limit))
  // Backend default is `recent` for this endpoint per OpenAPI.
  if (params.sort) search.set('sort', params.sort)
  const url = `/api/v1/users/${encodeURIComponent(username)}/posts?${search.toString()}`
  const cacheKey = `GET ${url}`
  try {
    const env = await apiFetchWithMeta<PostDto[], PostListMeta>(url)
    const result: PostListResult = {
      posts: mapPostDtos(env.data),
      pagination: metaToPagination(env.meta),
      // Spec 6.11b — derive crisis-flag presence from raw DTOs.
      hasCrisisFlag: hasAnyCrisisFlag(env.data),
    }
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<PostListResult>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

export interface ListCommentsParams {
  page: number
  limit: number
}

/** GET /api/v1/posts/{id}/comments — paginated comments (optional auth). */
export async function listComments(
  postId: string,
  params: ListCommentsParams,
): Promise<CommentListResult> {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('limit', String(params.limit))
  const url = `/api/v1/posts/${encodeURIComponent(postId)}/comments?${search.toString()}`
  const cacheKey = `GET ${url}`
  try {
    const env = await apiFetchWithMeta<CommentDto[], PostListMeta>(url)
    const result: CommentListResult = {
      comments: mapCommentDtos(env.data),
      pagination: metaToPagination(env.meta),
    }
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<CommentListResult>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

/** GET /api/v1/users/me/reactions — viewer's reactions map (Phase 3 Addendum #10 shape). */
export async function getMyReactions(): Promise<Record<string, PrayerReaction>> {
  const url = '/api/v1/users/me/reactions'
  const cacheKey = `GET ${url}`
  try {
    const dto = await apiFetch<ReactionsResponseApi>(url)
    const result = reactionsResponseToReactionsMap(dto)
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<Record<string, PrayerReaction>>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

export interface ListMyBookmarksParams {
  page: number
  limit: number
}

/** GET /api/v1/users/me/bookmarks — paginated bookmarked posts. */
export async function listMyBookmarks(
  params: ListMyBookmarksParams,
): Promise<PostListResult> {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('limit', String(params.limit))
  const url = `/api/v1/users/me/bookmarks?${search.toString()}`
  const cacheKey = `GET ${url}`
  try {
    const env = await apiFetchWithMeta<PostDto[], PostListMeta>(url)
    const result: PostListResult = {
      posts: mapPostDtos(env.data),
      pagination: metaToPagination(env.meta),
      // Spec 6.11b — derive crisis-flag presence from raw DTOs.
      hasCrisisFlag: hasAnyCrisisFlag(env.data),
    }
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<PostListResult>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

/** GET /api/v1/qotd/today — today's QOTD (no auth). */
export async function getTodaysQotd(): Promise<QotdQuestionResponse> {
  const url = '/api/v1/qotd/today'
  const cacheKey = `GET ${url}`
  try {
    const result = await apiFetch<QotdQuestionResponse>(url)
    cacheSet(cacheKey, result)
    return result
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
      const cached = cacheGet<QotdQuestionResponse>(cacheKey)
      if (cached) return cached
    }
    throw e
  }
}

// --- WRITE-side anti-anonymous gate (D8) ---

/**
 * Throws AnonymousWriteAttemptError if no JWT is stored. Called BEFORE the
 * network round-trip on every write function so anonymous users see the
 * AuthModal without a 401 + spurious wr:auth-invalidated event.
 */
function assertCanWrite(operation: string): void {
  if (getStoredToken() === null) {
    throw new AnonymousWriteAttemptError(operation)
  }
}

// --- POST WRITES ---

/**
 * POST /api/v1/posts — create a post.
 * The optional idempotencyKey is a UUID generated by the consumer hook
 * (typically `crypto.randomUUID()` per user-initiated submission). Server
 * dedups by (user, key); identical retries return the cached response.
 */
export async function createPost(
  input: CreatePostRequest,
  idempotencyKey?: string,
): Promise<PrayerRequest> {
  assertCanWrite('createPost')
  const headers: Record<string, string> = {}
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const dto = await apiFetch<PostDto>('/api/v1/posts', {
    method: 'POST',
    body: JSON.stringify(input),
    headers,
  })
  return postDtoToPrayerRequest(dto)
}

export async function updatePost(
  id: string,
  input: UpdatePostRequest,
): Promise<PrayerRequest> {
  assertCanWrite('updatePost')
  const dto = await apiFetch<PostDto>(`/api/v1/posts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return postDtoToPrayerRequest(dto)
}

export async function deletePost(id: string): Promise<void> {
  assertCanWrite('deletePost')
  await apiFetch<void>(`/api/v1/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/**
 * PATCH /api/v1/posts/{id}/resolve — Spec 4.4.
 *
 * Author-only. Marks a comment as the helpful answer to a question post.
 * Server-side rate limit is 30/hour per user. Server enforces:
 *  - post must exist and be of type `question` (else 400 INVALID_POST_TYPE_FOR_RESOLVE)
 *  - caller must be the post author (else 403 FORBIDDEN — no admin override)
 *  - comment must belong to the post and not be soft-deleted
 *
 * Returns the updated PrayerRequest with `questionResolvedCommentId` populated.
 * Idempotent on the server — re-marking the same comment helpful returns 200
 * with no DB write or `updated_at` bump.
 */
export async function resolveQuestion(
  postId: string,
  commentId: string,
): Promise<PrayerRequest> {
  assertCanWrite('resolveQuestion')
  const dto = await apiFetch<PostDto>(
    `/api/v1/posts/${encodeURIComponent(postId)}/resolve`,
    {
      method: 'PATCH',
      body: JSON.stringify({ commentId }),
    },
  )
  return postDtoToPrayerRequest(dto)
}

// --- REACTION WRITES ---

/**
 * POST /api/v1/posts/{id}/reactions — toggle praying, candle, or praising.
 * Returns {state: 'added' | 'removed', prayingCount, candleCount, praisingCount}.
 * Spec 6.6 added 'praising' for the Answered Wall; all three post-mutation
 * counters are returned regardless of which reactionType was toggled.
 */
export async function toggleReaction(
  postId: string,
  reactionType: ReactionTypeApi,
): Promise<{
  state: 'added' | 'removed'
  prayingCount: number
  candleCount: number
  praisingCount: number
}> {
  assertCanWrite('toggleReaction')
  const body: ToggleReactionRequest = { reactionType }
  const response = await apiFetch<ToggleReactionResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/reactions`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  return {
    state: response.state,
    prayingCount: response.prayingCount,
    candleCount: response.candleCount,
    praisingCount: response.praisingCount,
  }
}

/** DELETE /api/v1/posts/{id}/reactions?reactionType=... — explicit remove (idempotent). */
export async function removeReaction(
  postId: string,
  reactionType: ReactionTypeApi,
): Promise<void> {
  assertCanWrite('removeReaction')
  const search = new URLSearchParams({ reactionType })
  await apiFetch<void>(
    `/api/v1/posts/${encodeURIComponent(postId)}/reactions?${search.toString()}`,
    { method: 'DELETE' },
  )
}

// --- BOOKMARK WRITES ---

/**
 * POST /api/v1/posts/{id}/bookmark — idempotent.
 * Returns `{created: true}` on 201 (newly inserted) or `{created: false}` on 200
 * (already bookmarked). Backend's BookmarkResponse always has `bookmarked: true`,
 * so the create-vs-noop distinction is conveyed via HTTP status.
 *
 * apiFetch does NOT expose status — it strips the envelope. We use the wrapper
 * `apiFetchPostExpectStatus` (defined below) to peek at status.
 */
export async function addBookmark(
  postId: string,
): Promise<{ created: boolean }> {
  assertCanWrite('addBookmark')
  const result = await apiFetchPostExpectStatus<BookmarkResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/bookmark`,
  )
  return { created: result.status === 201 }
}

/**
 * Helper for endpoints where the consumer needs the HTTP status (e.g., 200
 * vs 201) AND the body. apiFetch alone strips this. Bookmark add benefits
 * from status visibility; toggleReaction uses the body's `state` field
 * instead, so this helper is bookmark-specific. Same auth + timeout + 401
 * behavior as apiFetch.
 */
async function apiFetchPostExpectStatus<T>(path: string): Promise<{
  status: number
  body: T
}> {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const url = path.startsWith('http') ? path : `${base}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getStoredToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timer)
    throw new ApiError('NETWORK_ERROR', 0, 'Unable to reach the server.', null)
  }
  clearTimeout(timer)
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      /* not JSON */
    }
  }
  if (!response.ok) {
    const errBody = (body ?? {}) as Record<string, unknown>
    const code = typeof errBody.code === 'string' ? errBody.code : 'UNKNOWN'
    const message =
      typeof errBody.message === 'string'
        ? errBody.message
        : text || response.statusText
    const requestId =
      typeof errBody.requestId === 'string' ? errBody.requestId : null
    if (response.status === 401) {
      const { clearStoredToken } = await import('@/lib/auth-storage')
      clearStoredToken()
      try {
        window.dispatchEvent(new CustomEvent('wr:auth-invalidated'))
      } catch {
        /* no-op */
      }
    }
    throw new ApiError(code, response.status, message, requestId)
  }
  const env = (body ?? {}) as { data?: unknown }
  return { status: response.status, body: env.data as T }
}

export async function removeBookmark(postId: string): Promise<void> {
  assertCanWrite('removeBookmark')
  await apiFetch<void>(`/api/v1/posts/${encodeURIComponent(postId)}/bookmark`, {
    method: 'DELETE',
  })
}

// --- COMMENT WRITES ---

export async function createComment(
  postId: string,
  content: string,
  idempotencyKey?: string,
): Promise<PrayerComment> {
  assertCanWrite('createComment')
  const body: CreateCommentRequest = { content }
  const headers: Record<string, string> = {}
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const dto = await apiFetch<CommentDto>(
    `/api/v1/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    },
  )
  return commentDtoToPrayerComment(dto)
}

export async function updateComment(
  _postId: string,
  commentId: string,
  content: string,
): Promise<PrayerComment> {
  assertCanWrite('updateComment')
  // Backend's edit endpoint is /api/v1/comments/{id} — postId is in the URL of
  // /comments listing but not the edit. Verified via openapi.yaml line 1687.
  // The postId parameter is preserved on the function signature for caller
  // convenience (consumers usually have it on hand) but is intentionally unused.
  const body: UpdateCommentRequest = { content }
  const dto = await apiFetch<CommentDto>(
    `/api/v1/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
  return commentDtoToPrayerComment(dto)
}

export async function deleteComment(
  _postId: string,
  commentId: string,
): Promise<void> {
  assertCanWrite('deleteComment')
  // Same path as updateComment — /api/v1/comments/{id}.
  await apiFetch<void>(`/api/v1/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  })
}

// =====================================================================
// Spec 4.6b — image upload
// =====================================================================

/**
 * Uploads an image to be attached to a testimony or question post.
 *
 * Returns the `uploadId` plus three presigned-GET URLs (full / medium / thumb).
 * The frontend stores the `uploadId` and submits it in the subsequent
 * `createPost` call; the backend MOVEs the pending image into the post's
 * permanent storage location at that point.
 *
 * Bypasses `apiFetch` because the request body is `multipart/form-data` rather
 * than JSON. Authorization header is read directly from `auth-storage`.
 */
export async function uploadImage(
  file: File,
): Promise<{ uploadId: string; full: string; medium: string; thumb: string }> {
  assertCanWrite('uploadImage')
  const token = getStoredToken()
  if (!token) throw new AnonymousWriteAttemptError('uploadImage')

  const formData = new FormData()
  formData.append('file', file)

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  const response = await fetch(`${baseUrl}/api/v1/uploads/post-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    let body: { code?: string; message?: string; requestId?: string } = {}
    try {
      body = await response.json()
    } catch {
      // Response wasn't JSON — fall through with empty body.
    }
    throw new ApiError(
      body.code ?? 'UNKNOWN',
      response.status,
      body.message ?? 'Image upload failed.',
      body.requestId ?? null,
    )
  }

  const result = (await response.json()) as {
    uploadId: string
    fullUrl: string
    mediumUrl: string
    thumbUrl: string
  }
  return {
    uploadId: result.uploadId,
    full: result.fullUrl,
    medium: result.mediumUrl,
    thumb: result.thumbUrl,
  }
}
