import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@/lib/auth-storage', () => ({
  getStoredToken: vi.fn(() => 'test-token'),
  clearStoredToken: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import {
  listPosts,
  getPostById,
  listAuthorPosts,
  listComments,
  getMyReactions,
  listMyBookmarks,
  getTodaysQotd,
  _resetReadCacheForTesting,
} from '../prayer-wall-api'
import type {
  PostDto,
  CommentDto,
  PostListMeta,
  ReactionsResponseApi,
  QotdQuestionResponse,
} from '@/types/api/prayer-wall'

// --- Fixture builders (mirrored from postMappers.test) ---

function buildPostDto(overrides: Partial<PostDto> = {}): PostDto {
  return {
    id: 'post-1',
    postType: 'prayer_request',
    content: 'sample',
    category: 'family',
    isAnonymous: false,
    challengeId: null,
    qotdId: null,
    scriptureReference: null,
    scriptureText: null,
    visibility: 'public',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    moderationStatus: 'approved',
    crisisFlag: false,
    prayingCount: 0,
    candleCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    createdAt: '2026-04-29T10:00:00Z',
    updatedAt: '2026-04-29T10:00:00Z',
    lastActivityAt: '2026-04-29T10:00:00Z',
    author: { id: 'u1', displayName: 'Sarah', avatarUrl: null },
    questionResolvedCommentId: null,
    ...overrides,
  }
}

function buildCommentDto(overrides: Partial<CommentDto> = {}): CommentDto {
  return {
    id: 'c1',
    postId: 'post-1',
    parentCommentId: null,
    content: 'sample comment',
    isHelpful: false,
    moderationStatus: 'approved',
    crisisFlag: false,
    createdAt: '2026-04-29T11:00:00Z',
    updatedAt: '2026-04-29T11:00:00Z',
    author: { id: 'u2', displayName: 'David', avatarUrl: null },
    replies: [],
    ...overrides,
  }
}

function buildMeta(overrides: Partial<PostListMeta> = {}): PostListMeta {
  return {
    page: 1,
    limit: 20,
    totalCount: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    requestId: 'req-1',
    ...overrides,
  }
}

// --- fetch mock helper for apiFetchWithMeta ---

function mockEnvelopeResponse<T, M>(body: { data: T; meta: M }, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

function mockFetchOnce(response: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce(response) as typeof fetch,
  )
}

function mockFetchRejectOnce(error: Error) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValueOnce(error) as typeof fetch,
  )
}

beforeEach(() => {
  _resetReadCacheForTesting()
  vi.unstubAllGlobals()
  vi.mocked(apiFetch).mockReset()
})

// --- listPosts ---

describe('listPosts', () => {
  it('issues GET /api/v1/posts with default page+limit and returns mapped posts + pagination', async () => {
    mockFetchOnce(
      mockEnvelopeResponse({
        data: [buildPostDto({ id: 'p1' })],
        meta: buildMeta({ totalCount: 42, hasNextPage: true }),
      }),
    )
    const result = await listPosts({ page: 1, limit: 20 })
    expect(result.posts).toHaveLength(1)
    expect(result.posts[0].id).toBe('p1')
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 42,
      hasMore: true,
    })
  })

  it('passes category, postType, qotdId, sort as query params', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      mockEnvelopeResponse({ data: [], meta: buildMeta({ totalCount: 0 }) }),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)
    await listPosts({
      page: 2,
      limit: 10,
      category: 'health',
      postType: 'prayer_request',
      qotdId: 'qotd-42',
      sort: 'recent',
    })
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('page=2')
    expect(url).toContain('limit=10')
    expect(url).toContain('category=health')
    expect(url).toContain('postType=prayer_request')
    expect(url).toContain('qotdId=qotd-42')
    expect(url).toContain('sort=recent')
  })

  it('returns empty result when backend returns empty data array', async () => {
    mockFetchOnce(
      mockEnvelopeResponse({
        data: [],
        meta: buildMeta({ totalCount: 0 }),
      }),
    )
    const result = await listPosts({ page: 1, limit: 20 })
    expect(result.posts).toEqual([])
    expect(result.pagination.total).toBe(0)
  })

  it('on NETWORK_ERROR returns the cached previous result', async () => {
    // First call seeds the cache.
    mockFetchOnce(
      mockEnvelopeResponse({
        data: [buildPostDto({ id: 'p1' })],
        meta: buildMeta(),
      }),
    )
    const first = await listPosts({ page: 1, limit: 20 })
    // Second call hits a network error.
    mockFetchRejectOnce(new Error('offline'))
    const second = await listPosts({ page: 1, limit: 20 })
    expect(second).toEqual(first)
  })

  it('on NETWORK_ERROR with no cache rethrows the ApiError', async () => {
    mockFetchRejectOnce(new Error('offline'))
    await expect(listPosts({ page: 1, limit: 20 })).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('on 500 throws an ApiError with status 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () =>
          Promise.resolve(
            JSON.stringify({
              code: 'INTERNAL_ERROR',
              message: 'oops',
              requestId: 'r1',
            }),
          ),
      } as unknown as Response),
    )
    await expect(listPosts({ page: 1, limit: 20 })).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
    })
  })
})

// --- getPostById ---

describe('getPostById', () => {
  it('issues GET /api/v1/posts/{id} and returns mapped PrayerRequest', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildPostDto({ id: 'p1' }))
    const result = await getPostById('p1')
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/p1')
    expect(result.id).toBe('p1')
    expect(result.authorName).toBe('Sarah')
  })

  it('on 404 throws ApiError', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('NOT_FOUND', 404, 'missing', null),
    )
    await expect(getPostById('p1')).rejects.toMatchObject({ status: 404 })
  })

  it('on NETWORK_ERROR with cache returns cached PrayerRequest', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildPostDto({ id: 'p1' }))
    const first = await getPostById('p1')
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('NETWORK_ERROR', 0, 'offline', null),
    )
    const second = await getPostById('p1')
    expect(second).toEqual(first)
  })

  it('on NETWORK_ERROR without cache rethrows', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('NETWORK_ERROR', 0, 'offline', null),
    )
    await expect(getPostById('p1')).rejects.toBeInstanceOf(ApiError)
  })
})

// --- listAuthorPosts ---

describe('listAuthorPosts', () => {
  it('issues GET /api/v1/users/{username}/posts with page+limit', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      mockEnvelopeResponse({
        data: [buildPostDto()],
        meta: buildMeta(),
      }),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)
    await listAuthorPosts('sarah-johnson', { page: 1, limit: 10 })
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('/api/v1/users/sarah-johnson/posts')
    expect(url).toContain('page=1')
    expect(url).toContain('limit=10')
  })

  it('does NOT add a sort query when omitted (backend default = recent)', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      mockEnvelopeResponse({
        data: [],
        meta: buildMeta({ totalCount: 0 }),
      }),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)
    await listAuthorPosts('alice', { page: 1, limit: 20 })
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).not.toContain('sort=')
  })
})

// --- listComments ---

describe('listComments', () => {
  it('issues GET /api/v1/posts/{id}/comments and returns mapped comments', async () => {
    mockFetchOnce(
      mockEnvelopeResponse({
        data: [buildCommentDto({ id: 'c1' })],
        meta: buildMeta(),
      }),
    )
    const result = await listComments('post-1', { page: 1, limit: 20 })
    expect(result.comments).toHaveLength(1)
    expect(result.comments[0].id).toBe('c1')
    expect(result.comments[0].prayerId).toBe('post-1')
  })

  it('returns empty list when zero comments', async () => {
    mockFetchOnce(
      mockEnvelopeResponse({ data: [], meta: buildMeta({ totalCount: 0 }) }),
    )
    const result = await listComments('post-1', { page: 1, limit: 20 })
    expect(result.comments).toEqual([])
  })
})

// --- getMyReactions ---

describe('getMyReactions', () => {
  it('issues GET /api/v1/users/me/reactions and returns mapped reactions record', async () => {
    const apiResponse: ReactionsResponseApi = {
      reactions: {
        'p1': { isPraying: true, isCandle: false, isBookmarked: true },
        'p2': { isPraying: false, isCandle: true, isBookmarked: false },
      },
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(apiResponse)
    const result = await getMyReactions()
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/me/reactions')
    expect(result['p1']).toEqual({
      prayerId: 'p1',
      isPraying: true,
      isBookmarked: true,
      isCandle: false,
    })
    expect(result['p2'].isCandle).toBe(true)
  })

  it('on 401 propagates the ApiError (apiFetch already cleared the token)', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('UNAUTHORIZED', 401, 'stale', null),
    )
    await expect(getMyReactions()).rejects.toMatchObject({ status: 401 })
  })
})

// --- listMyBookmarks ---

describe('listMyBookmarks', () => {
  it('issues GET /api/v1/users/me/bookmarks and returns paginated mapped posts', async () => {
    mockFetchOnce(
      mockEnvelopeResponse({
        data: [buildPostDto({ id: 'p1' })],
        meta: buildMeta({ totalCount: 1 }),
      }),
    )
    const result = await listMyBookmarks({ page: 1, limit: 20 })
    expect(result.posts).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })
})

// --- getTodaysQotd ---

describe('getTodaysQotd', () => {
  it('issues GET /api/v1/qotd/today and returns the question DTO', async () => {
    const qotd: QotdQuestionResponse = {
      id: 'qotd-42',
      text: 'What Bible verse has comforted you most recently?',
      theme: 'reflective',
      hint: null,
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(qotd)
    const result = await getTodaysQotd()
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/qotd/today')
    expect(result.id).toBe('qotd-42')
  })
})

// =====================================================================
// WRITE-SIDE TESTS (Step 7)
// =====================================================================

import {
  createPost,
  updatePost,
  deletePost,
  resolveQuestion,
  toggleReaction,
  removeReaction,
  addBookmark,
  removeBookmark,
  createComment,
  updateComment,
  deleteComment,
} from '../prayer-wall-api'
import { AnonymousWriteAttemptError } from '@/lib/prayer-wall/apiErrors'
import { getStoredToken } from '@/lib/auth-storage'

// Test-time helper: simulate "no token stored".
function setNoToken() {
  vi.mocked(getStoredToken).mockReturnValueOnce(null)
}

// --- assertCanWrite gate (D8) ---

describe('assertCanWrite — anonymous gate', () => {
  it('createPost throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(
      createPost({ postType: 'prayer_request', content: 'hi' }),
    ).rejects.toBeInstanceOf(AnonymousWriteAttemptError)
  })

  it('updatePost throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(updatePost('p1', { content: 'edit' })).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('deletePost throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(deletePost('p1')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('toggleReaction throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(toggleReaction('p1', 'praying')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('removeReaction throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(removeReaction('p1', 'praying')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('addBookmark throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(addBookmark('p1')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('removeBookmark throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(removeBookmark('p1')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('createComment throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(createComment('p1', 'hi')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('updateComment throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(updateComment('p1', 'c1', 'edit')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })

  it('deleteComment throws AnonymousWriteAttemptError when no token', async () => {
    setNoToken()
    await expect(deleteComment('p1', 'c1')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })
})

// --- createPost ---

describe('createPost', () => {
  it('issues POST /api/v1/posts with body and Idempotency-Key header', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildPostDto({ id: 'new-post' }))
    await createPost(
      { postType: 'prayer_request', content: 'pray for X' },
      'idempotency-uuid-1',
    )
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify({ postType: 'prayer_request', content: 'pray for X' }),
      headers: { 'Idempotency-Key': 'idempotency-uuid-1' },
    })
  })

  it('omits Idempotency-Key header when not provided', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildPostDto({ id: 'new-post' }))
    await createPost({ postType: 'prayer_request', content: 'pray for X' })
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify({ postType: 'prayer_request', content: 'pray for X' }),
      headers: {},
    })
  })

  it('returns mapped PrayerRequest from server response', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      buildPostDto({ id: 'new-post', author: { id: 'me', displayName: 'Me', avatarUrl: null } }),
    )
    const result = await createPost({ postType: 'prayer_request', content: 'hi' })
    expect(result.id).toBe('new-post')
    expect(result.userId).toBe('me')
  })

  it('on 400 VALIDATION_FAILED propagates ApiError', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('INVALID_INPUT', 400, 'content cannot be empty', null),
    )
    await expect(
      createPost({ postType: 'prayer_request', content: '' }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' })
  })

  it('on 429 RATE_LIMITED propagates ApiError (consumer reads Retry-After)', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('RATE_LIMITED', 429, 'too many', null),
    )
    await expect(
      createPost({ postType: 'prayer_request', content: 'hi' }),
    ).rejects.toMatchObject({ status: 429 })
  })

  it('on 422 IDEMPOTENCY_KEY_MISMATCH propagates ApiError', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('IDEMPOTENCY_KEY_MISMATCH', 422, 'mismatch', null),
    )
    await expect(
      createPost(
        { postType: 'prayer_request', content: 'hi' },
        'reused-key',
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_MISMATCH' })
  })
})

// --- updatePost ---

describe('updatePost', () => {
  it('issues PATCH /api/v1/posts/{id} with partial body', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildPostDto({ id: 'p1' }))
    await updatePost('p1', { content: 'edited' })
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/p1', {
      method: 'PATCH',
      body: JSON.stringify({ content: 'edited' }),
    })
  })

  it('on 409 EDIT_WINDOW_EXPIRED propagates ApiError with code EDIT_WINDOW_EXPIRED (Phase 3 Addendum #1)', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('EDIT_WINDOW_EXPIRED', 409, 'past window', null),
    )
    await expect(updatePost('p1', { content: 'edit' })).rejects.toMatchObject({
      status: 409,
      code: 'EDIT_WINDOW_EXPIRED',
    })
  })

  it('on 403 FORBIDDEN propagates (non-author edit attempt)', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('FORBIDDEN', 403, 'not author', null),
    )
    await expect(updatePost('p1', { content: 'edit' })).rejects.toMatchObject({
      status: 403,
    })
  })
})

// --- deletePost ---

describe('deletePost', () => {
  it('issues DELETE /api/v1/posts/{id} and returns void', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined as never)
    await deletePost('p1')
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/p1', {
      method: 'DELETE',
    })
  })

  it('on 403 propagates ApiError', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('FORBIDDEN', 403, 'not author', null),
    )
    await expect(deletePost('p1')).rejects.toMatchObject({ status: 403 })
  })

  it('on 404 propagates ApiError', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('NOT_FOUND', 404, 'missing', null),
    )
    await expect(deletePost('p1')).rejects.toMatchObject({ status: 404 })
  })
})

// --- resolveQuestion (Spec 4.4) ---

describe('prayerWallApi.resolveQuestion (Spec 4.4)', () => {
  it('issues PATCH /api/v1/posts/{id}/resolve with the correct path', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      buildPostDto({
        id: 'p1',
        postType: 'question',
        category: null,
        questionResolvedCommentId: 'comment-helpful-1',
      }),
    )
    await resolveQuestion('p1', 'comment-helpful-1')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/posts/p1/resolve',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('includes commentId in the body', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      buildPostDto({
        id: 'p1',
        postType: 'question',
        category: null,
        questionResolvedCommentId: 'comment-helpful-1',
      }),
    )
    await resolveQuestion('p1', 'comment-helpful-1')
    const callArgs = vi.mocked(apiFetch).mock.calls.at(-1)
    expect(callArgs?.[1]?.body).toBe(
      JSON.stringify({ commentId: 'comment-helpful-1' }),
    )
  })

  it('returns updated PrayerRequest with questionResolvedCommentId via mapper', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      buildPostDto({
        id: 'p1',
        postType: 'question',
        category: null,
        questionResolvedCommentId: 'comment-helpful-1',
      }),
    )
    const result = await resolveQuestion('p1', 'comment-helpful-1')
    expect(result.id).toBe('p1')
    expect(result.postType).toBe('question')
    expect(result.questionResolvedCommentId).toBe('comment-helpful-1')
  })

  it('throws AnonymousWriteAttemptError when not authenticated', async () => {
    setNoToken()
    await expect(resolveQuestion('p1', 'c1')).rejects.toBeInstanceOf(
      AnonymousWriteAttemptError,
    )
  })
})

// --- toggleReaction ---

describe('toggleReaction', () => {
  it('issues POST /api/v1/posts/{id}/reactions with reactionType=praying and returns {state, prayingCount, candleCount}', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      reactionType: 'praying',
      state: 'added',
      prayingCount: 4,
      candleCount: 1,
    })
    const result = await toggleReaction('p1', 'praying')
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/p1/reactions', {
      method: 'POST',
      body: JSON.stringify({ reactionType: 'praying' }),
    })
    expect(result).toEqual({ state: 'added', prayingCount: 4, candleCount: 1 })
  })

  it('returns state="removed" when toggling off', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      reactionType: 'candle',
      state: 'removed',
      prayingCount: 0,
      candleCount: 0,
    })
    const result = await toggleReaction('p1', 'candle')
    expect(result.state).toBe('removed')
  })

  it('on 429 propagates ApiError', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('RATE_LIMITED', 429, 'too many', null),
    )
    await expect(toggleReaction('p1', 'praying')).rejects.toMatchObject({
      status: 429,
    })
  })
})

// --- removeReaction ---

describe('removeReaction', () => {
  it('issues DELETE /api/v1/posts/{id}/reactions?reactionType=...', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined as never)
    await removeReaction('p1', 'candle')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/posts/p1/reactions?reactionType=candle',
      { method: 'DELETE' },
    )
  })
})

// --- addBookmark ---

describe('addBookmark', () => {
  it('returns {created: true} when status 201 (newly inserted)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: () =>
          Promise.resolve(
            JSON.stringify({
              data: { bookmarked: true, bookmarkCount: 1 },
              meta: { requestId: 'r1' },
            }),
          ),
      } as unknown as Response) as unknown as typeof fetch,
    )
    const result = await addBookmark('p1')
    expect(result).toEqual({ created: true })
  })

  it('returns {created: false} when status 200 (idempotent no-op)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () =>
          Promise.resolve(
            JSON.stringify({
              data: { bookmarked: true, bookmarkCount: 1 },
              meta: { requestId: 'r1' },
            }),
          ),
      } as unknown as Response) as unknown as typeof fetch,
    )
    const result = await addBookmark('p1')
    expect(result).toEqual({ created: false })
  })
})

// --- removeBookmark ---

describe('removeBookmark', () => {
  it('issues DELETE /api/v1/posts/{id}/bookmark and returns void', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined as never)
    await removeBookmark('p1')
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/p1/bookmark', {
      method: 'DELETE',
    })
  })
})

// --- createComment ---

describe('createComment', () => {
  it('issues POST /api/v1/posts/{id}/comments with content + Idempotency-Key', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildCommentDto({ id: 'c1' }))
    await createComment('p1', 'praying with you', 'idem-uuid-1')
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/p1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'praying with you' }),
      headers: { 'Idempotency-Key': 'idem-uuid-1' },
    })
  })

  it('returns mapped PrayerComment with prayerId set from postId', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      buildCommentDto({ id: 'c1', postId: 'p99' }),
    )
    const result = await createComment('p99', 'hi')
    expect(result.id).toBe('c1')
    expect(result.prayerId).toBe('p99')
  })
})

// --- updateComment ---

describe('updateComment', () => {
  it('issues PATCH /api/v1/comments/{id} with content (NOT /posts/{id}/comments/{id})', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildCommentDto({ id: 'c1' }))
    await updateComment('p1', 'c1', 'edited content')
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/comments/c1', {
      method: 'PATCH',
      body: JSON.stringify({ content: 'edited content' }),
    })
  })

  it('on 409 EDIT_WINDOW_EXPIRED propagates ApiError with code EDIT_WINDOW_EXPIRED', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('EDIT_WINDOW_EXPIRED', 409, 'past window', null),
    )
    await expect(updateComment('p1', 'c1', 'late edit')).rejects.toMatchObject({
      status: 409,
      code: 'EDIT_WINDOW_EXPIRED',
    })
  })
})

// --- deleteComment ---

describe('deleteComment', () => {
  it('issues DELETE /api/v1/comments/{id}', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined as never)
    await deleteComment('p1', 'c1')
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/comments/c1', {
      method: 'DELETE',
    })
  })
})
