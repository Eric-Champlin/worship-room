/**
 * Spec 3.12 — Flag-on tests for PrayerWallDashboard.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import type { PrayerRequest } from '@/types/prayer-wall'

// Hoist constants OUTSIDE the factory return so each useAuth() call returns
// the SAME user object identity. Otherwise the production component's
// useEffect deps include `user`, and changing identity each render → infinite
// re-render loop. The real AuthContext caches user in context state.
const STABLE_USER = { id: 'user-dev', name: 'Dev Seed', firstName: 'Dev', lastName: 'Seed' }
const STABLE_LOGIN = vi.fn()
const STABLE_LOGOUT = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: STABLE_USER,
    login: STABLE_LOGIN,
    logout: STABLE_LOGOUT,
  }),
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
import { PrayerWallDashboard } from '../PrayerWallDashboard'

function makePost(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 'p1',
    userId: 'user-dev',
    authorName: 'Dev Seed',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Some prayer body text here',
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

function renderDashboard() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall/dashboard']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Routes>
            <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PrayerWallDashboard — flag-on', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isBackendPrayerWallEnabled).mockReturnValue(true)
    // Default: empty list; tests override per scenario.
    vi.mocked(prayerWallApi.listPosts).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 50, total: 0, hasMore: false },
    })
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 50, total: 0, hasMore: false },
    })
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
  })

  it('Prayers tab calls listPosts and filters by user.id', async () => {
    vi.mocked(prayerWallApi.listPosts).mockResolvedValue({
      posts: [
        makePost({ id: 'mine', userId: 'user-dev', content: 'Prayer body owned by me' }),
        makePost({ id: 'other', userId: 'someone-else', content: 'Prayer body by stranger' }),
      ],
      pagination: { page: 1, limit: 50, total: 2, hasMore: false },
    })
    renderDashboard()
    expect(await screen.findByText('Prayer body owned by me')).toBeInTheDocument()
    expect(screen.queryByText('Prayer body by stranger')).not.toBeInTheDocument()
    expect(prayerWallApi.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 50, sort: 'recent' })
    )
  })

  it('Bookmarks tab calls listMyBookmarks when activated', async () => {
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [makePost({ id: 'bookmarked-1', content: 'Bookmarked prayer body' })],
      pagination: { page: 1, limit: 50, total: 1, hasMore: false },
    })
    renderDashboard()
    await userEvent.click(screen.getByRole('tab', { name: 'Bookmarks' }))
    expect(await screen.findByText('Bookmarked prayer body')).toBeInTheDocument()
    expect(prayerWallApi.listMyBookmarks).toHaveBeenCalled()
  })

  it('Comments tab shows backend-gap empty-tab message', async () => {
    renderDashboard()
    await userEvent.click(screen.getByRole('tab', { name: 'My Comments' }))
    expect(await screen.findByText('My comments are coming soon')).toBeInTheDocument()
  })

  it('Reactions tab derives from already-loaded data (no extra fetch)', async () => {
    renderDashboard()
    await userEvent.click(screen.getByRole('tab', { name: 'Reactions' }))
    // Empty state visible because no reactions are set up in the test stub.
    expect(await screen.findByText('No reactions yet')).toBeInTheDocument()
    // Reactions tab does NOT call listMyBookmarks with the dashboard's params
    // (page: 1, limit: 50). The reactionsStore hydration call uses
    // (page: 1, limit: 100) which is unrelated to the dashboard tab fetcher.
    const dashboardCalls = vi
      .mocked(prayerWallApi.listMyBookmarks)
      .mock.calls.filter((args) => args[0]?.limit === 50)
    expect(dashboardCalls.length).toBe(0)
  })
})
