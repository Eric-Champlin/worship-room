/**
 * Spec 3.12 — Flag-on tests for PrayerWall.tsx.
 *
 * These exercise the backend-read branch (`isBackendPrayerWallEnabled() === true`)
 * via mocked `prayerWallApi`. Flag-off regression coverage stays in
 * `PrayerWall.test.tsx`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWall } from '../PrayerWall'
import { ApiError } from '@/types/auth'
import type { PrayerRequest } from '@/types/prayer-wall'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {
      mood: false,
      pray: false,
      listen: false,
      prayerWall: false,
      meditate: false,
      journal: false,
    },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/lib/env', async () => {
  const actual = await vi.importActual<typeof import('@/lib/env')>('@/lib/env')
  return { ...actual, isBackendPrayerWallEnabled: vi.fn(() => true) }
})

vi.mock('@/services/api/prayer-wall-api')

import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'

function makePost(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 'p1',
    userId: 'u1',
    authorName: 'Sarah',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Praying for clarity',
    category: 'health',
    postType: 'prayer_request',
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

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <PrayerWall />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PrayerWall — flag-on', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isBackendPrayerWallEnabled).mockReturnValue(true)
    // reactionsStore.init() hydrates via getMyReactions + listMyBookmarks;
    // mock both so unhandled rejections don't surface.
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })
  })

  it('renders posts from listPosts response', async () => {
    vi.mocked(prayerWallApi.listPosts).mockResolvedValue({
      posts: [
        makePost({ id: 'a', content: 'First prayer body' }),
        makePost({ id: 'b', content: 'Second prayer body' }),
      ],
      pagination: { page: 1, limit: 20, total: 2, hasMore: false },
    })
    renderPage()
    expect(await screen.findByText('First prayer body')).toBeInTheDocument()
    expect(screen.getByText('Second prayer body')).toBeInTheDocument()
    expect(prayerWallApi.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, sort: 'bumped' })
    )
  })

  it('renders FeatureEmptyState with retry on error', async () => {
    vi.mocked(prayerWallApi.listPosts).mockRejectedValueOnce(
      new ApiError('NETWORK_ERROR', 0, 'Network unavailable', null)
    )
    renderPage()
    expect(await screen.findByText("We couldn't load prayers")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('renders skeleton during initial fetch', async () => {
    let resolveFetch!: (value: Awaited<ReturnType<typeof prayerWallApi.listPosts>>) => void
    vi.mocked(prayerWallApi.listPosts).mockImplementation(
      () =>
        new Promise((res) => {
          resolveFetch = res
        })
    )
    renderPage()
    // Skeleton's aria-busy region renders while pending.
    const skeletonRegions = await screen.findAllByText('Loading')
    expect(skeletonRegions.length).toBeGreaterThan(0)
    resolveFetch({
      posts: [makePost({ id: 'x', content: 'After resolve text' })],
      pagination: { page: 1, limit: 20, total: 1, hasMore: false },
    })
    expect(await screen.findByText('After resolve text')).toBeInTheDocument()
  })

  it('Show more calls listPosts page 2 and appends results', async () => {
    vi.mocked(prayerWallApi.listPosts)
      .mockResolvedValueOnce({
        posts: [makePost({ id: 'p-1', content: 'Page 1 prayer alpha' })],
        pagination: { page: 1, limit: 20, total: 2, hasMore: true },
      })
      .mockResolvedValueOnce({
        posts: [makePost({ id: 'p-2', content: 'Page 2 prayer beta' })],
        pagination: { page: 2, limit: 20, total: 2, hasMore: false },
      })
    renderPage()
    expect(await screen.findByText('Page 1 prayer alpha')).toBeInTheDocument()
    const loadMore = await screen.findByRole('button', { name: /load more/i })
    await userEvent.click(loadMore)
    expect(await screen.findByText('Page 2 prayer beta')).toBeInTheDocument()
    expect(prayerWallApi.listPosts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
  })

  it('flag-off regression — does not call listPosts', async () => {
    vi.mocked(isBackendPrayerWallEnabled).mockReturnValue(false)
    renderPage()
    // Wait a tick for any effects to fire.
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0))
    expect(prayerWallApi.listPosts).not.toHaveBeenCalled()
  })
})
