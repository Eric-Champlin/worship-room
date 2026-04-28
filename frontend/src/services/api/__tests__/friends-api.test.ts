import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'
import type { FriendRequestDto } from '@/types/api/friends'
import {
  sendFriendRequestApi,
  respondToFriendRequestApi,
  removeFriendApi,
  blockUserApi,
  unblockUserApi,
} from '../friends-api'

describe('friends-api', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockResolvedValue(undefined as never)
  })

  describe('sendFriendRequestApi', () => {
    it('calls POST /api/v1/users/me/friend-requests with toUserId and message', async () => {
      const mockResponse: FriendRequestDto = {
        id: 'backend-uuid',
        fromUserId: 'me',
        toUserId: 'alice-uuid',
        otherPartyDisplayName: 'Alice',
        otherPartyAvatarUrl: null,
        message: null,
        status: 'pending',
        createdAt: '2026-04-27T00:00:00Z',
        respondedAt: null,
      }
      vi.mocked(apiFetch).mockResolvedValue(mockResponse as never)
      const result = await sendFriendRequestApi('alice-uuid', null)
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/me/friend-requests', {
        method: 'POST',
        body: JSON.stringify({ toUserId: 'alice-uuid', message: null }),
      })
      expect(result.id).toBe('backend-uuid')
    })
  })

  describe('respondToFriendRequestApi', () => {
    it('calls PATCH /api/v1/friend-requests/{id} with action accept', async () => {
      await respondToFriendRequestApi('req-uuid', 'accept')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/friend-requests/req-uuid', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'accept' }),
      })
    })

    it('calls PATCH with action decline', async () => {
      await respondToFriendRequestApi('req-uuid', 'decline')
      const [, options] = vi.mocked(apiFetch).mock.calls[0]
      expect(JSON.parse(options?.body as string)).toEqual({ action: 'decline' })
    })

    it('calls PATCH with action cancel', async () => {
      await respondToFriendRequestApi('req-uuid', 'cancel')
      const [, options] = vi.mocked(apiFetch).mock.calls[0]
      expect(JSON.parse(options?.body as string)).toEqual({ action: 'cancel' })
    })
  })

  describe('removeFriendApi', () => {
    it('calls DELETE /api/v1/users/me/friends/{userId}', async () => {
      await removeFriendApi('friend-uuid')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/me/friends/friend-uuid', {
        method: 'DELETE',
      })
    })
  })

  describe('blockUserApi', () => {
    it('calls POST /api/v1/users/me/blocks with userId', async () => {
      await blockUserApi('user-uuid')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/me/blocks', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-uuid' }),
      })
    })
  })

  describe('unblockUserApi', () => {
    it('calls DELETE /api/v1/users/me/blocks/{userId}', async () => {
      await unblockUserApi('user-uuid')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/me/blocks/user-uuid', {
        method: 'DELETE',
      })
    })

    it('passes through apiFetch rejection', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('500'))
      await expect(unblockUserApi('user-uuid')).rejects.toThrow('500')
    })

    it('passes raw path-segment user IDs (does not encode — matches removeFriendApi)', async () => {
      await unblockUserApi('user-with/slash')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/me/blocks/user-with/slash', {
        method: 'DELETE',
      })
    })
  })
})
