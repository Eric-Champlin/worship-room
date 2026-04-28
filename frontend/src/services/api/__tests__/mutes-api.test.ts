import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'
import type { MutedUserApiResponse, MuteUserResponse } from '@/types/api/mutes'
import {
  muteUserApi,
  unmuteUserApi,
  listMutedUsersApi,
} from '../mutes-api'

describe('mutes-api', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockResolvedValue(undefined as never)
  })

  describe('muteUserApi', () => {
    it('calls POST /api/v1/mutes with { userId } body and returns the response data', async () => {
      const mockResponse: MuteUserResponse = {
        mutedUserId: 'bob-uuid',
        mutedAt: '2026-04-27T20:00:00Z',
      }
      vi.mocked(apiFetch).mockResolvedValue(mockResponse as never)

      const result = await muteUserApi('bob-uuid')

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/mutes', {
        method: 'POST',
        body: JSON.stringify({ userId: 'bob-uuid' }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('propagates the error when apiFetch rejects (4xx)', async () => {
      const apiError = new Error('400 INVALID_INPUT')
      vi.mocked(apiFetch).mockRejectedValue(apiError as never)

      await expect(muteUserApi('bob-uuid')).rejects.toThrow('400 INVALID_INPUT')
    })
  })

  describe('unmuteUserApi', () => {
    it('calls DELETE /api/v1/mutes/{userId} with no body', async () => {
      await unmuteUserApi('bob-uuid')

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/mutes/bob-uuid', {
        method: 'DELETE',
      })
      // No `body` field should appear in the options
      const [, options] = vi.mocked(apiFetch).mock.calls[0]
      expect((options as { body?: unknown }).body).toBeUndefined()
    })
  })

  describe('listMutedUsersApi', () => {
    it('calls GET /api/v1/mutes and returns the response array', async () => {
      const mockResponse: MutedUserApiResponse[] = [
        {
          userId: 'bob-uuid',
          displayName: 'Bob',
          avatarUrl: null,
          mutedAt: '2026-04-27T20:00:00Z',
        },
      ]
      vi.mocked(apiFetch).mockResolvedValue(mockResponse as never)

      const result = await listMutedUsersApi()

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/mutes', {
        method: 'GET',
      })
      expect(result).toEqual(mockResponse)
    })
  })
})
