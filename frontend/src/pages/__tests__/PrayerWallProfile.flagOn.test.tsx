/**
 * Spec 3.12 — Flag-on tests for PrayerWallProfile.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import type { PrayerRequest } from '@/types/prayer-wall'

const STABLE_USER = { id: 'viewer', name: 'Viewer User' }
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: STABLE_USER,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/lib/env', async () => {
  const actual = await vi.importActual<typeof import('@/lib/env')>('@/lib/env')
  return { ...actual, isBackendPrayerWallEnabled: vi.fn(() => true) }
})

vi.mock('@/services/api/prayer-wall-api')

import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { PrayerWallProfile } from '../PrayerWallProfile'

function makePost(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 'p1',
    userId: 'profile-target',
    authorName: 'Profile User',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Profile owner prayer body',
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

function renderProfile(userId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/prayer-wall/user/${userId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Routes>
            <Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PrayerWallProfile — flag-on', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isBackendPrayerWallEnabled).mockReturnValue(true)
    vi.mocked(prayerWallApi.listPosts).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 50, total: 0, hasMore: false },
    })
    // reactionsStore.init() also calls getMyReactions + listMyBookmarks during
    // hydration; mock those so they don't throw on undefined responses.
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 50, total: 0, hasMore: false },
    })
  })

  it('calls listPosts and filters by URL param userId', async () => {
    vi.mocked(prayerWallApi.listPosts).mockResolvedValue({
      posts: [
        makePost({ id: 'a', userId: 'profile-target', content: 'Body owned by profile-target' }),
        makePost({ id: 'b', userId: 'someone-else', content: 'Body by stranger' }),
      ],
      pagination: { page: 1, limit: 50, total: 2, hasMore: false },
    })
    renderProfile('profile-target')
    expect(await screen.findByText('Body owned by profile-target')).toBeInTheDocument()
    expect(screen.queryByText('Body by stranger')).not.toBeInTheDocument()
    expect(prayerWallApi.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 50, sort: 'recent' })
    )
  })

  it('renders placeholder profile chrome when no posts exist (until Phase 8.1)', async () => {
    // listPosts default mock returns empty. Profile chrome should fall back to
    // the generic "Profile" label without crashing.
    renderProfile('unknown-user')
    // The default heading is the firstName "Profile" (placeholder).
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
