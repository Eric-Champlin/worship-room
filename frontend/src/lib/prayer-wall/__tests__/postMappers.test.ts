import { describe, it, expect } from 'vitest'
import {
  postDtoToPrayerRequest,
  mapPostDtos,
  commentDtoToPrayerComment,
  mapCommentDtos,
  reactionsResponseToReactionsMap,
} from '../postMappers'
import type {
  PostDto,
  CommentDto,
  ReactionsResponseApi,
} from '@/types/api/prayer-wall'

// --- Fixture builders ---

function buildPostDto(overrides: Partial<PostDto> = {}): PostDto {
  return {
    id: 'post-1',
    postType: 'prayer_request',
    content: 'Please pray for my family.',
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
    prayingCount: 3,
    candleCount: 1,
    commentCount: 2,
    bookmarkCount: 0,
    createdAt: '2026-04-29T10:00:00Z',
    updatedAt: '2026-04-29T10:05:00Z',
    lastActivityAt: '2026-04-29T10:30:00Z',
    author: {
      id: 'user-uuid-1',
      displayName: 'Sarah',
      avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
    },
    questionResolvedCommentId: null,
    ...overrides,
  }
}

function buildCommentDto(overrides: Partial<CommentDto> = {}): CommentDto {
  return {
    id: 'comment-1',
    postId: 'post-1',
    parentCommentId: null,
    content: 'Praying with you.',
    isHelpful: false,
    moderationStatus: 'approved',
    crisisFlag: false,
    createdAt: '2026-04-29T11:00:00Z',
    updatedAt: '2026-04-29T11:00:00Z',
    author: {
      id: 'user-uuid-2',
      displayName: 'David',
      avatarUrl: null,
    },
    replies: [],
    ...overrides,
  }
}

// --- postDtoToPrayerRequest ---

describe('postDtoToPrayerRequest', () => {
  it('flattens nested author into userId/authorName/authorAvatarUrl', () => {
    const dto = buildPostDto()
    const result = postDtoToPrayerRequest(dto)
    expect(result.userId).toBe('user-uuid-1')
    expect(result.authorName).toBe('Sarah')
    expect(result.authorAvatarUrl).toBe('https://i.pravatar.cc/150?u=sarah')
  })

  it('produces userId=null for anonymous posts (author.id null)', () => {
    const dto = buildPostDto({
      isAnonymous: true,
      author: { id: null, displayName: 'Anonymous', avatarUrl: null },
    })
    const result = postDtoToPrayerRequest(dto)
    expect(result.userId).toBeNull()
    expect(result.authorName).toBe('Anonymous')
    expect(result.isAnonymous).toBe(true)
  })

  it('preserves Phase 3.7+ optional fields when present (D5)', () => {
    const dto = buildPostDto({
      candleCount: 5,
      bookmarkCount: 2,
      scriptureReference: 'John 3:16',
      scriptureText: 'For God so loved the world...',
    })
    const result = postDtoToPrayerRequest(dto)
    expect(result.postType).toBe('prayer_request')
    expect(result.candleCount).toBe(5)
    expect(result.bookmarkCount).toBe(2)
    expect(result.updatedAt).toBe('2026-04-29T10:05:00Z')
    expect(result.scriptureReference).toBe('John 3:16')
    expect(result.scriptureText).toBe('For God so loved the world...')
  })

  it('drops crisisFlag from the output (Phase 3 Addendum #7)', () => {
    const dto = buildPostDto({ crisisFlag: true })
    const result = postDtoToPrayerRequest(dto)
    expect(result).not.toHaveProperty('crisisFlag')
  })

  it('drops moderationStatus from the output', () => {
    const dto = buildPostDto({ moderationStatus: 'flagged' })
    const result = postDtoToPrayerRequest(dto)
    expect(result).not.toHaveProperty('moderationStatus')
  })

  it('drops visibility from the output', () => {
    const dto = buildPostDto({ visibility: 'friends' })
    const result = postDtoToPrayerRequest(dto)
    expect(result).not.toHaveProperty('visibility')
  })

  it('omits scriptureReference / scriptureText when null on the DTO', () => {
    const dto = buildPostDto({ scriptureReference: null, scriptureText: null })
    const result = postDtoToPrayerRequest(dto)
    expect(result.scriptureReference).toBeUndefined()
    expect(result.scriptureText).toBeUndefined()
  })

  it('falls back category=null to "other" (defensive — Phase 4 question/discussion case)', () => {
    const dto = buildPostDto({ postType: 'question', category: null })
    const result = postDtoToPrayerRequest(dto)
    expect(result.category).toBe('other')
  })

  it('preserves qotdId when set (QOTD response post)', () => {
    const dto = buildPostDto({
      category: 'discussion',
      qotdId: 'qotd-42',
    })
    const result = postDtoToPrayerRequest(dto)
    expect(result.qotdId).toBe('qotd-42')
  })

  it('preserves challengeId when set (challenge-tagged post)', () => {
    const dto = buildPostDto({ challengeId: 'lent-2026' })
    const result = postDtoToPrayerRequest(dto)
    expect(result.challengeId).toBe('lent-2026')
  })
})

describe('postDtoToPrayerRequest — Spec 4.4 question fields', () => {
  it('plumbs questionResolvedCommentId when present', () => {
    const dto = buildPostDto({
      postType: 'question',
      category: null,
      questionResolvedCommentId: 'comment-helpful-1',
    })
    const result = postDtoToPrayerRequest(dto)
    expect(result.questionResolvedCommentId).toBe('comment-helpful-1')
  })

  it('omits questionResolvedCommentId when null on the DTO', () => {
    const dto = buildPostDto({
      postType: 'question',
      category: null,
      questionResolvedCommentId: null,
    })
    const result = postDtoToPrayerRequest(dto)
    expect(result.questionResolvedCommentId).toBeUndefined()
  })
})

describe('commentDtoToPrayerComment — Spec 4.4 question fields', () => {
  it('plumbs parentCommentId, isHelpful, and replies when present', () => {
    const reply = buildCommentDto({ id: 'reply-1', content: 'reply content' })
    const dto = buildCommentDto({
      parentCommentId: 'parent-comment-id',
      isHelpful: true,
      replies: [reply],
    })
    const result = commentDtoToPrayerComment(dto)
    expect(result.parentCommentId).toBe('parent-comment-id')
    expect(result.isHelpful).toBe(true)
    expect(result.replies).toHaveLength(1)
    expect(result.replies?.[0].id).toBe('reply-1')
    expect(result.replies?.[0].content).toBe('reply content')
  })
})

describe('mapPostDtos — array integrity (cross-author leakage prevention)', () => {
  it('preserves per-DTO author identity across an array of 5 distinct authors', () => {
    const dtos: PostDto[] = [
      buildPostDto({
        id: 'post-1',
        author: { id: 'u1', displayName: 'Alice', avatarUrl: null },
      }),
      buildPostDto({
        id: 'post-2',
        author: { id: 'u2', displayName: 'Bob', avatarUrl: null },
      }),
      buildPostDto({
        id: 'post-3',
        author: { id: 'u3', displayName: 'Carol', avatarUrl: null },
      }),
      buildPostDto({
        id: 'post-4',
        author: { id: 'u4', displayName: 'Dan', avatarUrl: null },
      }),
      buildPostDto({
        id: 'post-5',
        author: { id: 'u5', displayName: 'Eve', avatarUrl: null },
      }),
    ]
    const results = mapPostDtos(dtos)
    expect(results).toHaveLength(5)
    expect(results[0]).toMatchObject({ id: 'post-1', userId: 'u1', authorName: 'Alice' })
    expect(results[1]).toMatchObject({ id: 'post-2', userId: 'u2', authorName: 'Bob' })
    expect(results[2]).toMatchObject({ id: 'post-3', userId: 'u3', authorName: 'Carol' })
    expect(results[3]).toMatchObject({ id: 'post-4', userId: 'u4', authorName: 'Dan' })
    expect(results[4]).toMatchObject({ id: 'post-5', userId: 'u5', authorName: 'Eve' })
  })

  it('returns an empty array when given an empty array', () => {
    expect(mapPostDtos([])).toEqual([])
  })
})

// --- commentDtoToPrayerComment ---

describe('commentDtoToPrayerComment', () => {
  it('flattens nested author and renames postId → prayerId', () => {
    const dto = buildCommentDto()
    const result = commentDtoToPrayerComment(dto)
    expect(result).toEqual({
      id: 'comment-1',
      prayerId: 'post-1',
      userId: 'user-uuid-2',
      authorName: 'David',
      authorAvatarUrl: null,
      content: 'Praying with you.',
      createdAt: '2026-04-29T11:00:00Z',
      // Spec 4.4 — buildCommentDto default isHelpful=false; the mapper now
      // plumbs the boolean through (parentCommentId stays absent because the
      // builder's default is null, replies stays absent because the builder's
      // default is []).
      isHelpful: false,
    })
  })

  it('drops crisisFlag, moderationStatus, updatedAt (Spec 4.4 plumbs parentCommentId/isHelpful/replies)', () => {
    const dto = buildCommentDto({
      parentCommentId: 'parent-comment-id',
      isHelpful: true,
      replies: [buildCommentDto({ id: 'reply-1' })],
      crisisFlag: true,
      moderationStatus: 'flagged',
    })
    const result = commentDtoToPrayerComment(dto)
    // Spec 4.4 — these fields are now plumbed through the mapper.
    expect(result.parentCommentId).toBe('parent-comment-id')
    expect(result.isHelpful).toBe(true)
    expect(result.replies).toHaveLength(1)
    expect(result.replies?.[0].id).toBe('reply-1')
    // Still dropped (no consumer in current PrayerComment shape).
    expect(result).not.toHaveProperty('crisisFlag')
    expect(result).not.toHaveProperty('moderationStatus')
    expect(result).not.toHaveProperty('updatedAt')
  })

  it('coerces author.id null to empty string (defensive — backend should never send this for comments)', () => {
    const dto = buildCommentDto({
      author: { id: null, displayName: 'Anonymous', avatarUrl: null },
    })
    expect(commentDtoToPrayerComment(dto).userId).toBe('')
  })
})

describe('mapCommentDtos', () => {
  it('preserves order across an array', () => {
    const dtos: CommentDto[] = [
      buildCommentDto({ id: 'c1', content: 'first' }),
      buildCommentDto({ id: 'c2', content: 'second' }),
      buildCommentDto({ id: 'c3', content: 'third' }),
    ]
    const results = mapCommentDtos(dtos)
    expect(results.map((c) => c.content)).toEqual(['first', 'second', 'third'])
  })

  it('returns empty array on empty input', () => {
    expect(mapCommentDtos([])).toEqual([])
  })
})

// --- reactionsResponseToReactionsMap ---

describe('reactionsResponseToReactionsMap (Phase 3 Addendum #10)', () => {
  it('returns an empty record when response.reactions is empty', () => {
    const response: ReactionsResponseApi = { reactions: {} }
    expect(reactionsResponseToReactionsMap(response)).toEqual({})
  })

  it('produces exactly the wr_prayer_reactions field shape per post', () => {
    const response: ReactionsResponseApi = {
      reactions: {
        // Spec 6.6b — isCelebrating added; mapper surfaces all five reaction-state flags.
        'post-1': {
          isPraying: true,
          isCandle: false,
          isPraising: false,
          isCelebrating: false,
          isBookmarked: true,
        },
      },
    }
    const result = reactionsResponseToReactionsMap(response)
    expect(result['post-1']).toEqual({
      prayerId: 'post-1',
      isPraying: true,
      isBookmarked: true,
      isCandle: false,
      isPraising: false,
      isCelebrating: false,
    })
  })

  it('handles multiple posts without cross-leakage', () => {
    const response: ReactionsResponseApi = {
      reactions: {
        'post-1': { isPraying: true, isCandle: false, isPraising: false, isBookmarked: false },
        'post-2': { isPraying: false, isCandle: true, isPraising: false, isBookmarked: false },
        'post-3': { isPraying: false, isCandle: false, isPraising: false, isBookmarked: true },
      },
    }
    const result = reactionsResponseToReactionsMap(response)
    expect(result['post-1'].isPraying).toBe(true)
    expect(result['post-2'].isCandle).toBe(true)
    expect(result['post-3'].isBookmarked).toBe(true)
    expect(result['post-1'].isCandle).toBe(false)
    expect(result['post-2'].isBookmarked).toBe(false)
  })

  it('defensively defaults missing isCandle to false (legacy shape forgiveness)', () => {
    const response = {
      reactions: {
        'post-x': { isPraying: true, isBookmarked: false } as unknown as {
          isPraying: boolean
          isCandle: boolean
          isBookmarked: boolean
        },
      },
    }
    const result = reactionsResponseToReactionsMap(response)
    expect(result['post-x'].isCandle).toBe(false)
  })

  it('returns an empty record when the response is malformed (defensive)', () => {
    expect(
      reactionsResponseToReactionsMap(
        undefined as unknown as ReactionsResponseApi,
      ),
    ).toEqual({})
    expect(
      reactionsResponseToReactionsMap(
        null as unknown as ReactionsResponseApi,
      ),
    ).toEqual({})
    expect(
      reactionsResponseToReactionsMap(
        {} as unknown as ReactionsResponseApi,
      ),
    ).toEqual({})
  })
})
