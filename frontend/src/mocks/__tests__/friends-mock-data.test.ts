import { describe, it, expect } from 'vitest'
import {
  MOCK_FRIENDS,
  MOCK_SUGGESTIONS,
  ALL_MOCK_USERS,
  createDefaultFriendsData,
} from '../friends-mock-data'

describe('friends-mock-data', () => {
  describe('MOCK_FRIENDS', () => {
    it('contains exactly 10 friends', () => {
      expect(MOCK_FRIENDS).toHaveLength(10)
    })

    it('all friends have required FriendProfile fields', () => {
      for (const friend of MOCK_FRIENDS) {
        expect(friend.id).toBeTruthy()
        expect(friend.displayName).toBeTruthy()
        expect(typeof friend.level).toBe('number')
        expect(friend.level).toBeGreaterThanOrEqual(1)
        expect(friend.level).toBeLessThanOrEqual(6)
        expect(friend.levelName).toBeTruthy()
        expect(typeof friend.currentStreak).toBe('number')
        expect(typeof friend.faithPoints).toBe('number')
        expect(typeof friend.weeklyPoints).toBe('number')
        expect(friend.lastActive).toBeTruthy()
        // lastActive should be a valid ISO string
        expect(new Date(friend.lastActive).getTime()).not.toBeNaN()
      }
    })
  })

  describe('MOCK_SUGGESTIONS', () => {
    it('contains exactly 3 suggestions', () => {
      expect(MOCK_SUGGESTIONS).toHaveLength(3)
    })
  })

  describe('createDefaultFriendsData', () => {
    it('creates data with 2 incoming and 1 outgoing request', () => {
      const data = createDefaultFriendsData('test-user')
      expect(data.pendingIncoming).toHaveLength(2)
      expect(data.pendingOutgoing).toHaveLength(1)
    })

    it('creates data with 10 friends', () => {
      const data = createDefaultFriendsData('test-user')
      expect(data.friends).toHaveLength(10)
    })

    it('creates data with empty blocked list', () => {
      const data = createDefaultFriendsData('test-user')
      expect(data.blocked).toEqual([])
    })

    it('uses the provided userId in request profiles', () => {
      const data = createDefaultFriendsData('my-user-id')
      expect(data.pendingIncoming[0].to.id).toBe('my-user-id')
      expect(data.pendingOutgoing[0].from.id).toBe('my-user-id')
    })
  })

  describe('ALL_MOCK_USERS', () => {
    it('contains all unique users (friends + request senders/recipients + suggestions)', () => {
      // 10 friends + 2 incoming senders + 1 outgoing recipient + 3 suggestions = 16
      expect(ALL_MOCK_USERS).toHaveLength(16)
    })

    it('has no duplicate IDs', () => {
      const ids = ALL_MOCK_USERS.map((u) => u.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
