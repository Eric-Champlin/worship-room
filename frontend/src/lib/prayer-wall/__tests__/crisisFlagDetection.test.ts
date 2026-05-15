import { describe, it, expect } from 'vitest'
import { hasAnyCrisisFlag, isCrisisFlagged } from '../crisisFlagDetection'
import type { PostDto } from '@/types/api/prayer-wall'

function makeDto(overrides: Partial<PostDto> = {}): PostDto {
  return {
    id: 'p-1',
    postType: 'prayer_request',
    content: 'test',
    isAnonymous: false,
    crisisFlag: false,
    moderationStatus: 'visible',
    visibility: 'public',
    isOwnPost: false,
    isFriendOfAuthor: false,
    isAuthorBlocked: false,
    isAuthorMuted: false,
    isDeleted: false,
    answeredAt: null,
    answeredText: null,
    candleCount: 0,
    prayingCount: 0,
    amenCount: 0,
    heartCount: 0,
    praisingCount: 0,
    celebrateCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    qotdId: null,
    questionResolvedCommentId: null,
    helpTags: [],
    imageMediaId: null,
    imageThumbnailUrl: null,
    imageMediumUrl: null,
    imageFullUrl: null,
    createdAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-15T00:00:00Z',
    bumpedAt: '2026-05-15T00:00:00Z',
    user: {
      id: 'u-1',
      displayName: 'Test User',
      avatarUrl: null,
      isAdmin: false,
    },
    ...overrides,
  } as unknown as PostDto
}

describe('crisisFlagDetection', () => {
  describe('hasAnyCrisisFlag', () => {
    it('returns false when given null', () => {
      expect(hasAnyCrisisFlag(null)).toBe(false)
    })

    it('returns false when given undefined', () => {
      expect(hasAnyCrisisFlag(undefined)).toBe(false)
    })

    it('returns false when given empty array', () => {
      expect(hasAnyCrisisFlag([])).toBe(false)
    })

    it('returns false when all posts have crisisFlag false', () => {
      const dtos = [makeDto(), makeDto({ id: 'p-2' }), makeDto({ id: 'p-3' })]
      expect(hasAnyCrisisFlag(dtos)).toBe(false)
    })

    it('returns true when ANY post has crisisFlag true', () => {
      const dtos = [makeDto(), makeDto({ id: 'p-2', crisisFlag: true }), makeDto({ id: 'p-3' })]
      expect(hasAnyCrisisFlag(dtos)).toBe(true)
    })

    it('returns true when single post has crisisFlag true', () => {
      const dtos = [makeDto({ crisisFlag: true })]
      expect(hasAnyCrisisFlag(dtos)).toBe(true)
    })
  })

  describe('isCrisisFlagged', () => {
    it('returns false for null', () => {
      expect(isCrisisFlagged(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isCrisisFlagged(undefined)).toBe(false)
    })

    it('returns false when crisisFlag is false', () => {
      expect(isCrisisFlagged(makeDto())).toBe(false)
    })

    it('returns true when crisisFlag is true', () => {
      expect(isCrisisFlagged(makeDto({ crisisFlag: true }))).toBe(true)
    })
  })
})
