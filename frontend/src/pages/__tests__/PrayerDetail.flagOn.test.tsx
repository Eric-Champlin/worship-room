/**
 * Spec 3.12 — Flag-on tests for PrayerDetail.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ApiError } from '@/types/auth'
import type { PrayerRequest } from '@/types/prayer-wall'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/services/api/reports-api', () => ({
  reportPost: vi.fn().mockResolvedValue({ reportId: 'r-1', created: true }),
}))

vi.mock('@/lib/env', async () => {
  const actual = await vi.importActual<typeof import('@/lib/env')>('@/lib/env')
  return { ...actual, isBackendPrayerWallEnabled: vi.fn(() => true) }
})

vi.mock('@/services/api/prayer-wall-api')

import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { PrayerDetail } from '../PrayerDetail'

function makePost(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 'p1',
    userId: 'u1',
    authorName: 'Sarah',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Body text for detail page',
    category: 'health',
    challengeId: null,
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-04-30T10:00:00Z',
    lastActivityAt: '2026-04-30T10:00:00Z',
    prayingCount: 0,
    commentCount: 0,
    ...overrides,
  }
}

function renderDetail(prayerId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/prayer-wall/${prayerId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Routes>
            <Route path="/prayer-wall/:id" element={<PrayerDetail />} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PrayerDetail — flag-on', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })
  })

  it('calls getPostById and renders post', async () => {
    vi.mocked(prayerWallApi.getPostById).mockResolvedValue(
      makePost({ id: 'real-id', content: 'Real backend prayer text here' })
    )
    vi.mocked(prayerWallApi.listComments).mockResolvedValue({
      comments: [],
      pagination: { page: 1, limit: 50, total: 0, hasMore: false },
    })
    renderDetail('real-id')
    // Wait for fetch to resolve and post body to render. The text may appear in
    // both the breadcrumb (truncated) and the PrayerCard body, so use findAllByText.
    const matches = await screen.findAllByText('Real backend prayer text here')
    expect(matches.length).toBeGreaterThan(0)
    expect(prayerWallApi.getPostById).toHaveBeenCalledWith('real-id')
  })

  it('renders Prayer not found UI on 404', async () => {
    vi.mocked(prayerWallApi.getPostById).mockRejectedValueOnce(
      new ApiError('NOT_FOUND', 404, 'Post not found', null)
    )
    vi.mocked(prayerWallApi.listComments).mockRejectedValueOnce(
      new ApiError('NOT_FOUND', 404, 'Post not found', null)
    )
    renderDetail('bogus')
    expect(await screen.findByText('Prayer not found')).toBeInTheDocument()
  })

  it('flag-off regression — does not call getPostById', async () => {
    vi.mocked(isBackendPrayerWallEnabled).mockReturnValue(false)
    renderDetail('prayer-1')
    // Wait for sync render path to settle.
    await screen.findByRole('main')
    expect(prayerWallApi.getPostById).not.toHaveBeenCalled()
  })
})
