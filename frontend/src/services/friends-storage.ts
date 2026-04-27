import type { FriendProfile, FriendRequest, FriendsData } from '@/types/dashboard'
import { createDefaultFriendsData } from '@/mocks/friends-mock-data'

export const FRIENDS_KEY = 'wr_friends'

export const EMPTY_FRIENDS_DATA: FriendsData = {
  friends: [],
  pendingIncoming: [],
  pendingOutgoing: [],
  blocked: [],
}

export function getFriendsData(): FriendsData {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY)
    if (!raw) return EMPTY_FRIENDS_DATA
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      !Array.isArray(parsed.friends) ||
      !Array.isArray(parsed.pendingIncoming) ||
      !Array.isArray(parsed.pendingOutgoing) ||
      !Array.isArray(parsed.blocked)
    ) {
      return EMPTY_FRIENDS_DATA
    }
    return parsed as FriendsData
  } catch (_e) {
    // Corrupted localStorage data — return empty defaults
    return EMPTY_FRIENDS_DATA
  }
}

export function saveFriendsData(data: FriendsData): boolean {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
    return true
  } catch (_e) {
    // localStorage write failed (quota exceeded or unavailable)
    return false
  }
}

function initializeFriendsData(currentUserId: string): FriendsData {
  const data = createDefaultFriendsData(currentUserId)
  saveFriendsData(data)
  return data
}

export function getOrInitFriendsData(currentUserId: string): FriendsData {
  const existing = localStorage.getItem(FRIENDS_KEY)
  if (existing) {
    return getFriendsData()
  }
  return initializeFriendsData(currentUserId)
}

// --- Pure operation functions (take data in, return new data out) ---

export function sendFriendRequest(
  data: FriendsData,
  fromProfile: FriendProfile,
  toProfile: FriendProfile,
): FriendsData {
  // Prevent self-friending
  if (fromProfile.id === toProfile.id) return data

  // Prevent if blocked
  if (data.blocked.includes(toProfile.id)) return data

  // Prevent if already friends
  if (data.friends.some((f) => f.id === toProfile.id)) return data

  // Prevent duplicate request
  if (
    data.pendingOutgoing.some((r) => r.to.id === toProfile.id) ||
    data.pendingIncoming.some((r) => r.from.id === toProfile.id)
  ) {
    return data
  }

  const request: FriendRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    from: fromProfile,
    to: toProfile,
    sentAt: new Date().toISOString(),
  }

  return {
    ...data,
    pendingOutgoing: [...data.pendingOutgoing, request],
  }
}

export function acceptFriendRequest(data: FriendsData, requestId: string): FriendsData {
  const request = data.pendingIncoming.find((r) => r.id === requestId)
  if (!request) return data

  return {
    ...data,
    friends: [...data.friends, request.from],
    pendingIncoming: data.pendingIncoming.filter((r) => r.id !== requestId),
  }
}

export function declineFriendRequest(data: FriendsData, requestId: string): FriendsData {
  return {
    ...data,
    pendingIncoming: data.pendingIncoming.filter((r) => r.id !== requestId),
  }
}

export function cancelOutgoingRequest(data: FriendsData, requestId: string): FriendsData {
  return {
    ...data,
    pendingOutgoing: data.pendingOutgoing.filter((r) => r.id !== requestId),
  }
}

export function removeFriend(data: FriendsData, friendId: string): FriendsData {
  return {
    ...data,
    friends: data.friends.filter((f) => f.id !== friendId),
  }
}

export function blockUser(data: FriendsData, userId: string): FriendsData {
  return {
    ...data,
    friends: data.friends.filter((f) => f.id !== userId),
    pendingIncoming: data.pendingIncoming.filter((r) => r.from.id !== userId),
    pendingOutgoing: data.pendingOutgoing.filter((r) => r.to.id !== userId),
    blocked: data.blocked.includes(userId) ? data.blocked : [...data.blocked, userId],
  }
}

/**
 * Attaches the backend's UUID to the outgoing friend request matching `toUserId`,
 * if and only if that request does not already have a `backendId`. Idempotent
 * against double-callback firing — a second call with the same `toUserId` is
 * a no-op once `backendId` is set. Spec 2.5.4 (Frontend Friends Dual-Write).
 */
export function attachBackendId(
  data: FriendsData,
  toUserId: string,
  backendId: string,
): FriendsData {
  return {
    ...data,
    pendingOutgoing: data.pendingOutgoing.map((req) =>
      req.to.id === toUserId && !req.backendId ? { ...req, backendId } : req,
    ),
  }
}

export function isBlocked(data: FriendsData, userId: string): boolean {
  return data.blocked.includes(userId)
}

export function isFriend(data: FriendsData, userId: string): boolean {
  return data.friends.some((f) => f.id === userId)
}

export function hasPendingRequest(data: FriendsData, userId: string): boolean {
  return (
    data.pendingIncoming.some((r) => r.from.id === userId) ||
    data.pendingOutgoing.some((r) => r.to.id === userId)
  )
}
