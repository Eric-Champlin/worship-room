import { useCallback, useMemo, useState } from 'react'
import type { FriendProfile, FriendsData } from '@/types/dashboard'
import { useAuth } from '@/hooks/useAuth'
import {
  getOrInitFriendsData,
  saveFriendsData,
  sendFriendRequest as storageSendRequest,
  acceptFriendRequest as storageAcceptRequest,
  declineFriendRequest as storageDeclineRequest,
  cancelOutgoingRequest as storageCancelRequest,
  removeFriend as storageRemoveFriend,
  blockUser as storageBlockUser,
} from '@/services/friends-storage'
import { ALL_MOCK_USERS, MOCK_SUGGESTIONS } from '@/mocks/friends-mock-data'

export interface FriendSearchResult extends FriendProfile {
  status: 'friend' | 'pending-incoming' | 'pending-outgoing' | 'none'
}

const EMPTY_DATA: FriendsData = {
  friends: [],
  pendingIncoming: [],
  pendingOutgoing: [],
  blocked: [],
}

export function useFriends() {
  const { isAuthenticated, user } = useAuth()

  const [data, setData] = useState<FriendsData>(() => {
    if (!isAuthenticated || !user) return EMPTY_DATA
    return getOrInitFriendsData(user.id)
  })

  const persist = useCallback((newData: FriendsData) => {
    setData(newData)
    saveFriendsData(newData)
  }, [])

  const friends = useMemo(
    () => [...data.friends].sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()),
    [data.friends],
  )

  const suggestions = useMemo(() => {
    if (!isAuthenticated || !user) return []
    const friendIds = new Set(data.friends.map((f) => f.id))
    const pendingIds = new Set([
      ...data.pendingIncoming.map((r) => r.from.id),
      ...data.pendingOutgoing.map((r) => r.to.id),
    ])
    const blockedIds = new Set(data.blocked)

    return MOCK_SUGGESTIONS.filter(
      (s) => s.id !== user.id && !friendIds.has(s.id) && !pendingIds.has(s.id) && !blockedIds.has(s.id),
    )
  }, [isAuthenticated, user, data.friends, data.pendingIncoming, data.pendingOutgoing, data.blocked])

  const searchUsers = useCallback(
    (query: string): FriendSearchResult[] => {
      if (!isAuthenticated || !user || query.length < 2) return []
      const lowerQuery = query.toLowerCase()
      const blockedIds = new Set(data.blocked)
      const friendIds = new Set(data.friends.map((f) => f.id))
      const incomingIds = new Set(data.pendingIncoming.map((r) => r.from.id))
      const outgoingIds = new Set(data.pendingOutgoing.map((r) => r.to.id))

      return ALL_MOCK_USERS.filter(
        (u) => u.id !== user.id && !blockedIds.has(u.id) && u.displayName.toLowerCase().includes(lowerQuery),
      ).map((u) => {
        let status: FriendSearchResult['status'] = 'none'
        if (friendIds.has(u.id)) status = 'friend'
        else if (incomingIds.has(u.id)) status = 'pending-incoming'
        else if (outgoingIds.has(u.id)) status = 'pending-outgoing'
        return { ...u, status }
      })
    },
    [isAuthenticated, user, data],
  )

  const sendRequest = useCallback(
    (toProfile: FriendProfile) => {
      if (!isAuthenticated || !user) return
      const currentUserProfile: FriendProfile = {
        id: user.id,
        displayName: user.name,
        avatar: '',
        level: 1,
        levelName: 'Seedling',
        currentStreak: 0,
        faithPoints: 0,
        weeklyPoints: 0,
        lastActive: new Date().toISOString(),
      }
      persist(storageSendRequest(data, currentUserProfile, toProfile))
    },
    [isAuthenticated, user, data, persist],
  )

  const acceptRequest = useCallback(
    (requestId: string) => {
      if (!isAuthenticated) return
      persist(storageAcceptRequest(data, requestId))
    },
    [isAuthenticated, data, persist],
  )

  const declineRequest = useCallback(
    (requestId: string) => {
      if (!isAuthenticated) return
      persist(storageDeclineRequest(data, requestId))
    },
    [isAuthenticated, data, persist],
  )

  const cancelRequest = useCallback(
    (requestId: string) => {
      if (!isAuthenticated) return
      persist(storageCancelRequest(data, requestId))
    },
    [isAuthenticated, data, persist],
  )

  const removeAFriend = useCallback(
    (friendId: string) => {
      if (!isAuthenticated) return
      persist(storageRemoveFriend(data, friendId))
    },
    [isAuthenticated, data, persist],
  )

  const blockAUser = useCallback(
    (userId: string) => {
      if (!isAuthenticated) return
      persist(storageBlockUser(data, userId))
    },
    [isAuthenticated, data, persist],
  )

  return {
    friends,
    pendingIncoming: data.pendingIncoming,
    pendingOutgoing: data.pendingOutgoing,
    blocked: data.blocked,
    suggestions,
    searchUsers,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend: removeAFriend,
    blockUser: blockAUser,
    friendCount: data.friends.length,
  }
}
