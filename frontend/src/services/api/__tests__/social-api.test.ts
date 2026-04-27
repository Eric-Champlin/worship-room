import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'
import {
  sendEncouragementApi,
  sendNudgeApi,
  sendRecapDismissalApi,
} from '../social-api'

describe('social-api', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockResolvedValue({
      id: 'backend-uuid',
      createdAt: '2026-04-27T00:00:00Z',
    } as never)
  })

  describe('sendEncouragementApi', () => {
    it('calls POST /api/v1/social/encouragements with toUserId and message', async () => {
      const result = await sendEncouragementApi('alice-uuid', 'Praying for you.')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/social/encouragements', {
        method: 'POST',
        body: JSON.stringify({ toUserId: 'alice-uuid', message: 'Praying for you.' }),
      })
      expect(result).toEqual({ id: 'backend-uuid', createdAt: '2026-04-27T00:00:00Z' })
    })

    it('propagates 4xx ApiError', async () => {
      const apiError = Object.assign(new Error('NOT_FRIENDS'), { code: 'NOT_FRIENDS' })
      vi.mocked(apiFetch).mockRejectedValue(apiError)
      await expect(
        sendEncouragementApi('alice-uuid', 'msg'),
      ).rejects.toMatchObject({ code: 'NOT_FRIENDS' })
    })

    it('propagates network error', async () => {
      const networkError = Object.assign(new Error('NETWORK_ERROR'), { code: 'NETWORK_ERROR' })
      vi.mocked(apiFetch).mockRejectedValue(networkError)
      await expect(
        sendEncouragementApi('alice-uuid', 'msg'),
      ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    })
  })

  describe('sendNudgeApi', () => {
    it('calls POST /api/v1/social/nudges with toUserId', async () => {
      const result = await sendNudgeApi('alice-uuid')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/social/nudges', {
        method: 'POST',
        body: JSON.stringify({ toUserId: 'alice-uuid' }),
      })
      expect(result.id).toBe('backend-uuid')
    })

    it('propagates 409 NUDGE_COOLDOWN', async () => {
      const apiError = Object.assign(new Error('NUDGE_COOLDOWN'), { code: 'NUDGE_COOLDOWN' })
      vi.mocked(apiFetch).mockRejectedValue(apiError)
      await expect(sendNudgeApi('alice-uuid'))
        .rejects.toMatchObject({ code: 'NUDGE_COOLDOWN' })
    })

    it('propagates network error', async () => {
      const networkError = Object.assign(new Error('NETWORK_ERROR'), { code: 'NETWORK_ERROR' })
      vi.mocked(apiFetch).mockRejectedValue(networkError)
      await expect(sendNudgeApi('alice-uuid'))
        .rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    })
  })

  describe('sendRecapDismissalApi', () => {
    it('calls POST /api/v1/social/recap-dismissal with weekStart', async () => {
      const result = await sendRecapDismissalApi('2026-04-21')
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/social/recap-dismissal', {
        method: 'POST',
        body: JSON.stringify({ weekStart: '2026-04-21' }),
      })
      expect(result.id).toBe('backend-uuid')
    })

    it('propagates 400 INVALID_INPUT', async () => {
      const apiError = Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' })
      vi.mocked(apiFetch).mockRejectedValue(apiError)
      await expect(sendRecapDismissalApi('not-a-date'))
        .rejects.toMatchObject({ code: 'INVALID_INPUT' })
    })

    it('propagates network error', async () => {
      const networkError = Object.assign(new Error('NETWORK_ERROR'), { code: 'NETWORK_ERROR' })
      vi.mocked(apiFetch).mockRejectedValue(networkError)
      await expect(sendRecapDismissalApi('2026-04-21'))
        .rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    })
  })
})
