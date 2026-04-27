import { describe, it, expect, beforeEach } from 'vitest'
import type { FriendProfile, FriendsData } from '@/types/dashboard'
import {
  FRIENDS_KEY,
  EMPTY_FRIENDS_DATA,
  getFriendsData,
  saveFriendsData,
  getOrInitFriendsData,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelOutgoingRequest,
  removeFriend,
  blockUser,
  attachBackendId,
  isBlocked,
  isFriend,
  hasPendingRequest,
} from '../friends-storage'

const ALICE: FriendProfile = {
  id: 'alice',
  displayName: 'Alice A.',
  avatar: '',
  level: 2,
  levelName: 'Sprout',
  currentStreak: 5,
  faithPoints: 200,
  weeklyPoints: 50,
  lastActive: new Date().toISOString(),
}

const BOB: FriendProfile = {
  id: 'bob',
  displayName: 'Bob B.',
  avatar: '',
  level: 3,
  levelName: 'Blooming',
  currentStreak: 10,
  faithPoints: 500,
  weeklyPoints: 80,
  lastActive: new Date().toISOString(),
}

const CURRENT_USER: FriendProfile = {
  id: 'current-user',
  displayName: 'Test User',
  avatar: '',
  level: 1,
  levelName: 'Seedling',
  currentStreak: 0,
  faithPoints: 0,
  weeklyPoints: 0,
  lastActive: new Date().toISOString(),
}

function makeData(overrides: Partial<FriendsData> = {}): FriendsData {
  return {
    friends: [],
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
    ...overrides,
  }
}

describe('friends-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getFriendsData', () => {
    it('returns empty on missing key', () => {
      expect(getFriendsData()).toEqual(EMPTY_FRIENDS_DATA)
    })

    it('returns empty on corrupted JSON', () => {
      localStorage.setItem(FRIENDS_KEY, '{bad json')
      expect(getFriendsData()).toEqual(EMPTY_FRIENDS_DATA)
    })

    it('returns empty on invalid shape (missing arrays)', () => {
      localStorage.setItem(FRIENDS_KEY, JSON.stringify({ friends: 'not-array' }))
      expect(getFriendsData()).toEqual(EMPTY_FRIENDS_DATA)
    })

    it('returns stored data when valid', () => {
      const data = makeData({ friends: [ALICE] })
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
      expect(getFriendsData().friends).toHaveLength(1)
      expect(getFriendsData().friends[0].id).toBe('alice')
    })
  })

  describe('saveFriendsData', () => {
    it('saves data to localStorage', () => {
      const data = makeData({ friends: [ALICE] })
      expect(saveFriendsData(data)).toBe(true)
      const stored = JSON.parse(localStorage.getItem(FRIENDS_KEY)!)
      expect(stored.friends).toHaveLength(1)
    })
  })

  describe('getOrInitFriendsData', () => {
    it('initializes with mock data when key does not exist', () => {
      const data = getOrInitFriendsData('test-user')
      expect(data.friends).toHaveLength(10)
      expect(data.pendingIncoming).toHaveLength(2)
      expect(data.pendingOutgoing).toHaveLength(1)
    })

    it('returns existing data when key exists', () => {
      const existing = makeData({ friends: [ALICE] })
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(existing))
      const data = getOrInitFriendsData('test-user')
      expect(data.friends).toHaveLength(1)
    })
  })

  describe('sendFriendRequest', () => {
    it('creates pending outgoing request', () => {
      const data = makeData()
      const result = sendFriendRequest(data, CURRENT_USER, ALICE)
      expect(result.pendingOutgoing).toHaveLength(1)
      expect(result.pendingOutgoing[0].to.id).toBe('alice')
    })

    it('prevents duplicate request', () => {
      const data = makeData()
      const first = sendFriendRequest(data, CURRENT_USER, ALICE)
      const second = sendFriendRequest(first, CURRENT_USER, ALICE)
      expect(second.pendingOutgoing).toHaveLength(1)
    })

    it('rejects blocked user', () => {
      const data = makeData({ blocked: ['alice'] })
      const result = sendFriendRequest(data, CURRENT_USER, ALICE)
      expect(result.pendingOutgoing).toHaveLength(0)
    })

    it('rejects if already friends', () => {
      const data = makeData({ friends: [ALICE] })
      const result = sendFriendRequest(data, CURRENT_USER, ALICE)
      expect(result.pendingOutgoing).toHaveLength(0)
    })

    it('rejects self-friending', () => {
      const data = makeData()
      const result = sendFriendRequest(data, CURRENT_USER, CURRENT_USER)
      expect(result.pendingOutgoing).toHaveLength(0)
    })
  })

  describe('acceptFriendRequest', () => {
    it('moves from pendingIncoming to friends', () => {
      const data = makeData({
        pendingIncoming: [
          {
            id: 'req-1',
            from: ALICE,
            to: CURRENT_USER,
            sentAt: new Date().toISOString(),
          },
        ],
      })
      const result = acceptFriendRequest(data, 'req-1')
      expect(result.friends).toHaveLength(1)
      expect(result.friends[0].id).toBe('alice')
      expect(result.pendingIncoming).toHaveLength(0)
    })

    it('no-ops for unknown request ID', () => {
      const data = makeData()
      const result = acceptFriendRequest(data, 'nonexistent')
      expect(result.friends).toHaveLength(0)
    })
  })

  describe('declineFriendRequest', () => {
    it('removes from pendingIncoming without adding to friends', () => {
      const data = makeData({
        pendingIncoming: [
          {
            id: 'req-1',
            from: ALICE,
            to: CURRENT_USER,
            sentAt: new Date().toISOString(),
          },
        ],
      })
      const result = declineFriendRequest(data, 'req-1')
      expect(result.friends).toHaveLength(0)
      expect(result.pendingIncoming).toHaveLength(0)
    })
  })

  describe('cancelOutgoingRequest', () => {
    it('removes from pendingOutgoing', () => {
      const data = makeData({
        pendingOutgoing: [
          {
            id: 'req-out-1',
            from: CURRENT_USER,
            to: ALICE,
            sentAt: new Date().toISOString(),
          },
        ],
      })
      const result = cancelOutgoingRequest(data, 'req-out-1')
      expect(result.pendingOutgoing).toHaveLength(0)
    })
  })

  describe('removeFriend', () => {
    it('removes from friends list', () => {
      const data = makeData({ friends: [ALICE, BOB] })
      const result = removeFriend(data, 'alice')
      expect(result.friends).toHaveLength(1)
      expect(result.friends[0].id).toBe('bob')
    })
  })

  describe('blockUser', () => {
    it('adds to blocked and removes from friends', () => {
      const data = makeData({ friends: [ALICE, BOB] })
      const result = blockUser(data, 'alice')
      expect(result.blocked).toContain('alice')
      expect(result.friends).toHaveLength(1)
      expect(result.friends[0].id).toBe('bob')
    })

    it('removes pending requests for blocked user', () => {
      const data = makeData({
        pendingIncoming: [
          {
            id: 'req-1',
            from: ALICE,
            to: CURRENT_USER,
            sentAt: new Date().toISOString(),
          },
        ],
        pendingOutgoing: [
          {
            id: 'req-2',
            from: CURRENT_USER,
            to: BOB,
            sentAt: new Date().toISOString(),
          },
        ],
      })
      const result = blockUser(data, 'alice')
      expect(result.pendingIncoming).toHaveLength(0)
      expect(result.pendingOutgoing).toHaveLength(1) // Bob's request unaffected
    })

    it('does not duplicate in blocked array', () => {
      const data = makeData({ blocked: ['alice'] })
      const result = blockUser(data, 'alice')
      expect(result.blocked.filter((id) => id === 'alice')).toHaveLength(1)
    })
  })

  describe('isFriend', () => {
    it('returns true for friend', () => {
      const data = makeData({ friends: [ALICE] })
      expect(isFriend(data, 'alice')).toBe(true)
    })

    it('returns false for non-friend', () => {
      const data = makeData()
      expect(isFriend(data, 'alice')).toBe(false)
    })
  })

  describe('isBlocked', () => {
    it('returns true for blocked user', () => {
      const data = makeData({ blocked: ['alice'] })
      expect(isBlocked(data, 'alice')).toBe(true)
    })

    it('returns false for non-blocked user', () => {
      const data = makeData()
      expect(isBlocked(data, 'alice')).toBe(false)
    })
  })

  describe('hasPendingRequest', () => {
    it('returns true for incoming request', () => {
      const data = makeData({
        pendingIncoming: [
          {
            id: 'req-1',
            from: ALICE,
            to: CURRENT_USER,
            sentAt: new Date().toISOString(),
          },
        ],
      })
      expect(hasPendingRequest(data, 'alice')).toBe(true)
    })

    it('returns true for outgoing request', () => {
      const data = makeData({
        pendingOutgoing: [
          {
            id: 'req-1',
            from: CURRENT_USER,
            to: BOB,
            sentAt: new Date().toISOString(),
          },
        ],
      })
      expect(hasPendingRequest(data, 'bob')).toBe(true)
    })

    it('returns false when no pending requests', () => {
      const data = makeData()
      expect(hasPendingRequest(data, 'alice')).toBe(false)
    })
  })

  describe('attachBackendId', () => {
    it('updates the matching outgoing request with backendId', () => {
      const initial = sendFriendRequest(makeData(), CURRENT_USER, ALICE)
      const result = attachBackendId(initial, ALICE.id, 'backend-uuid-1')
      expect(result.pendingOutgoing[0].backendId).toBe('backend-uuid-1')
      expect(result.pendingOutgoing[0].to.id).toBe(ALICE.id)
    })

    it('is a no-op when no matching outgoing request exists', () => {
      const data = makeData()
      const result = attachBackendId(data, 'no-such-user', 'backend-uuid-1')
      expect(result.pendingOutgoing).toEqual([])
    })

    it('is idempotent — second call does not overwrite an existing backendId', () => {
      const initial = sendFriendRequest(makeData(), CURRENT_USER, ALICE)
      const first = attachBackendId(initial, ALICE.id, 'backend-uuid-first')
      const second = attachBackendId(first, ALICE.id, 'backend-uuid-second')
      expect(second.pendingOutgoing[0].backendId).toBe('backend-uuid-first')
    })
  })
})
