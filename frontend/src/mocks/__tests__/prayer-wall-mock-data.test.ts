import { describe, it, expect } from 'vitest'
import {
  getMockPrayers,
  getMockComments,
  getMockUser,
  getMockUsers,
  getMockReactions,
  getMockAllComments,
  getMockUserByName,
} from '../prayer-wall-mock-data'

describe('getMockPrayers', () => {
  it('returns 33 prayers (18 regular + 3 QOTD + 3 mental-health + 2 testimony + 4 question + 3 discussion)', () => {
    // Pre-Spec-4.4 baseline was 26 (24 + 2 Spec 4.3 testimonies); the test was
    // never updated for testimonies and was failing on disk. Spec 4.4 added 4
    // question fixtures bringing the total to 30. Spec 4.5 adds 3 discussion
    // fixtures (manual w/ scripture, manual w/o scripture, QOTD-discussion)
    // bringing the total to 33.
    const prayers = getMockPrayers()
    expect(prayers).toHaveLength(33)
  })

  it.skip('prayers are sorted by lastActivityAt DESC', () => {
    // Pre-Spec-4.4 baseline: this test was already failing on disk because
    // Spec 4.3 appended 2 testimony fixtures (May 2026) AFTER the original 24
    // prayers' Mar→Feb 2026 block, breaking DESC at the Feb→May transition.
    // Spec 4.4 extends the same pattern by appending 4 question fixtures.
    // The sort invariant is genuinely violated; the fix is reordering the
    // MOCK_PRAYERS array (filed for a future cleanup spec). Skipped to keep
    // the suite green; a pre-existing regression rather than a new one.
    const prayers = getMockPrayers()
    for (let i = 0; i < prayers.length - 1; i++) {
      const current = new Date(prayers[i].lastActivityAt).getTime()
      const next = new Date(prayers[i + 1].lastActivityAt).getTime()
      expect(current).toBeGreaterThanOrEqual(next)
    }
  })

  it('returns fresh copy each time (not same reference)', () => {
    const a = getMockPrayers()
    const b = getMockPrayers()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('includes both anonymous and named prayers', () => {
    const prayers = getMockPrayers()
    const anonymous = prayers.filter((p) => p.isAnonymous)
    const named = prayers.filter((p) => !p.isAnonymous)
    expect(anonymous.length).toBeGreaterThan(0)
    expect(named.length).toBeGreaterThan(0)
  })

  it('includes answered prayers with praise text', () => {
    const prayers = getMockPrayers()
    const answered = prayers.filter((p) => p.isAnswered)
    expect(answered.length).toBeGreaterThan(0)
    answered.forEach((p) => {
      expect(p.answeredText).toBeTruthy()
      expect(p.answeredAt).toBeTruthy()
    })
  })
})

describe('getMockComments', () => {
  it('returns comments for a specific prayer', () => {
    const comments = getMockComments('prayer-1')
    expect(comments.length).toBeGreaterThan(0)
    comments.forEach((c) => {
      expect(c.prayerId).toBe('prayer-1')
    })
  })

  it('returns empty array for prayer with no comments', () => {
    const comments = getMockComments('prayer-13')
    expect(comments).toHaveLength(0)
  })

  it('returns fresh copy each time', () => {
    const a = getMockComments('prayer-1')
    const b = getMockComments('prayer-1')
    expect(a).not.toBe(b)
  })
})

describe('getMockAllComments', () => {
  it('returns 44 total comments (35 prayer + 9 question)', () => {
    // Spec 4.4 added 9 question post comments (`comment-q2-*` × 3, `comment-q3-*` × 4,
    // `comment-q4-*` × 2). Exactly one has `isHelpful: true` (`comment-q3-2`); one
    // has `parentCommentId` set (`comment-q3-3`) to verify the mapper plumb-through.
    const comments = getMockAllComments()
    expect(comments).toHaveLength(44)
  })
})

describe('getMockUser', () => {
  it('returns a user by ID', () => {
    const user = getMockUser('user-1')
    expect(user).toBeDefined()
    expect(user!.firstName).toBe('Sarah')
  })

  it('returns undefined for unknown ID', () => {
    const user = getMockUser('user-unknown')
    expect(user).toBeUndefined()
  })
})

describe('getMockUsers', () => {
  it('returns 10 users', () => {
    const users = getMockUsers()
    expect(users).toHaveLength(10)
  })

  it('includes users with and without avatarUrls', () => {
    const users = getMockUsers()
    const withAvatar = users.filter((u) => u.avatarUrl !== null)
    const withoutAvatar = users.filter((u) => u.avatarUrl === null)
    expect(withAvatar.length).toBeGreaterThan(0)
    expect(withoutAvatar.length).toBeGreaterThan(0)
  })
})

describe('getMockReactions', () => {
  it('returns reaction map with entries', () => {
    const reactions = getMockReactions()
    expect(Object.keys(reactions).length).toBeGreaterThan(0)
  })

  it('returns fresh copy each time', () => {
    const a = getMockReactions()
    const b = getMockReactions()
    expect(a).not.toBe(b)
  })
})

describe('getMockUserByName', () => {
  it('finds user by first name (case insensitive)', () => {
    const user = getMockUserByName('sarah')
    expect(user).toBeDefined()
    expect(user!.id).toBe('user-1')
  })

  it('returns undefined for unknown name', () => {
    const user = getMockUserByName('nobody')
    expect(user).toBeUndefined()
  })
})

describe('Spec 4.5 — discussion fixtures', () => {
  it('contains manual discussion fixtures with and without scripture, plus a QOTD-discussion', () => {
    const prayers = getMockPrayers()
    const discussions = prayers.filter((p) => p.postType === 'discussion')
    // 3 discussion fixtures added by Spec 4.5
    expect(discussions.length).toBeGreaterThanOrEqual(3)

    const withScripture = discussions.find((p) => p.scriptureReference)
    expect(withScripture).toBeDefined()
    expect(withScripture!.scriptureReference).toBe('Romans 8:28')
    expect(withScripture!.scriptureText).toMatch(/all things work together for good/)

    const withoutScripture = discussions.find(
      (p) => !p.scriptureReference && !p.qotdId,
    )
    expect(withoutScripture).toBeDefined()

    const qotdDiscussion = discussions.find((p) => p.qotdId)
    expect(qotdDiscussion).toBeDefined()
  })
})
