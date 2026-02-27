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
  it('returns 18 prayers', () => {
    const prayers = getMockPrayers()
    expect(prayers).toHaveLength(18)
  })

  it('prayers are sorted by lastActivityAt DESC', () => {
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
  it('returns 35 total comments', () => {
    const comments = getMockAllComments()
    expect(comments).toHaveLength(35)
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
