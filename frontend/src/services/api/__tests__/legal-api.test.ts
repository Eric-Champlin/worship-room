import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'
import { getLegalVersionsApi, acceptLegalVersionsApi } from '../legal-api'

describe('legal-api', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockResolvedValue(undefined as never)
  })

  describe('getLegalVersionsApi', () => {
    it('calls GET /api/v1/legal/versions and returns body', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        termsVersion: '2026-04-29',
        privacyVersion: '2026-04-29',
        communityGuidelinesVersion: '2026-04-29',
      } as never)

      const result = await getLegalVersionsApi()

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/legal/versions', {
        method: 'GET',
      })
      expect(result.termsVersion).toBe('2026-04-29')
      expect(result.privacyVersion).toBe('2026-04-29')
      expect(result.communityGuidelinesVersion).toBe('2026-04-29')
    })
  })

  describe('acceptLegalVersionsApi', () => {
    it('POSTs body to /api/v1/users/me/legal/accept', async () => {
      await acceptLegalVersionsApi('2026-04-29', '2026-04-29')

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/users/me/legal/accept', {
        method: 'POST',
        body: JSON.stringify({
          termsVersion: '2026-04-29',
          privacyVersion: '2026-04-29',
        }),
      })
    })
  })
})
