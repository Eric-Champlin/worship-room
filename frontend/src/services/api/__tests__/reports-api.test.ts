import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import type { ReportResult } from '../reports-api'
import { reportPost, reportComment } from '../reports-api'

describe('reports-api', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  describe('reportPost', () => {
    it('calls POST /api/v1/posts/{postId}/reports with reason + details and returns the result', async () => {
      const mockResponse: ReportResult = { reportId: 'r-1', created: true }
      vi.mocked(apiFetch).mockResolvedValue(mockResponse as never)

      const result = await reportPost('post-1', 'spam', 'looks like spam')

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/post-1/reports', {
        method: 'POST',
        body: JSON.stringify({ reason: 'spam', details: 'looks like spam' }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('returns idempotent result with created=false', async () => {
      const mockResponse: ReportResult = { reportId: 'r-existing', created: false }
      vi.mocked(apiFetch).mockResolvedValue(mockResponse as never)

      const result = await reportPost('post-1', 'spam')

      expect(result.created).toBe(false)
      expect(result.reportId).toBe('r-existing')
    })

    it('omits details from body when undefined', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ reportId: 'r-1', created: true } as never)

      await reportPost('post-1', 'other')

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/posts/post-1/reports', {
        method: 'POST',
        body: JSON.stringify({ reason: 'other' }),
      })
    })

    it('omits details from body when whitespace-only string', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ reportId: 'r-1', created: true } as never)

      await reportPost('post-1', 'spam', '   ')

      const call = vi.mocked(apiFetch).mock.calls[0]
      const body = JSON.parse((call[1] as { body: string }).body)
      expect(body).toEqual({ reason: 'spam' })
    })

    it('propagates ApiError on 404', async () => {
      const apiError = new ApiError('NOT_FOUND', 404, 'This content is no longer available.', 'req-x')
      vi.mocked(apiFetch).mockRejectedValue(apiError as never)

      await expect(reportPost('missing', 'spam')).rejects.toBe(apiError)
    })

    it('propagates ApiError on 429', async () => {
      const apiError = new ApiError(
        'RATE_LIMITED',
        429,
        "You're submitting reports quickly — please wait about 1 hour before trying again.",
        'req-y',
      )
      vi.mocked(apiFetch).mockRejectedValue(apiError as never)

      await expect(reportPost('post-1', 'spam')).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
      })
    })

    it('encodes the postId in the URL path', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ reportId: 'r-1', created: true } as never)

      await reportPost('post id with spaces', 'spam')

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/posts/post%20id%20with%20spaces/reports',
        expect.any(Object),
      )
    })
  })

  describe('reportComment', () => {
    it('calls POST /api/v1/comments/{commentId}/reports', async () => {
      const mockResponse: ReportResult = { reportId: 'r-2', created: true }
      vi.mocked(apiFetch).mockResolvedValue(mockResponse as never)

      const result = await reportComment('c-1', 'harassment', 'mean comment')

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/comments/c-1/reports', {
        method: 'POST',
        body: JSON.stringify({ reason: 'harassment', details: 'mean comment' }),
      })
      expect(result).toEqual(mockResponse)
    })
  })
})
