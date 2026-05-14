/**
 * Spec 6.6 — AnsweredWall page tests.
 *
 * Coverage of the new /prayer-wall/answered route per spec acceptance
 * criteria A, B, G, and Plan Step 13:
 *
 *   1. Renders the heading + subhead from the Copy Deck
 *   2. Calls `listPosts({ sort: 'answered' })` (existing endpoint per
 *      Plan-Time Discovery #1 — no new endpoint, no new query param)
 *   3. Renders one AnsweredCard per fixture post
 *   4. Renders the empty state when the feed is empty
 *   5. Renders exactly one `<h1>` (Gate-G-A11Y heading hierarchy)
 */
import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AnsweredWall from '../AnsweredWall'
import type { PrayerRequest } from '@/types/prayer-wall'

// Same mock posture as PrayerWall.flagOn.test.tsx — keep page tests scoped to
// the page surface; auth, faith-points, and api are mocked.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isAuthResolving: false,
    login: vi.fn(),
    logout: vi.fn(),
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

// usePrayerReactions internally consumes useToast + useAuthModal for DI
// wiring (Spec 3.11). Mock both so we don't have to wrap the page in
// ToastProvider + AuthModalProvider just for the hook's side-effects.
// Use importOriginal so other exports from the Toast module (e.g.,
// useToastSafe consumed by ShareDropdown) keep their real implementations.
vi.mock('@/components/ui/Toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/Toast')>()
  return {
    ...actual,
    useToast: () => ({ showToast: vi.fn(), showCelebrationToast: vi.fn() }),
  }
})
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
  AuthModalProvider: ({ children }: { children: ReactNode }) => children,
}))

// Spec 6.4 — useWatchMode drives CrisisResourcesBanner mounting on every
// Prayer Wall family route. Default to inactive for these tests so we don't
// have to assert banner DOM here (that's covered by CrisisResourcesBanner.test
// and PageShell-watch.test); a single banner-presence smoke is included below.
vi.mock('@/hooks/useWatchMode', () => ({
  useWatchMode: vi.fn(() => ({ active: false })),
}))

vi.mock('@/services/api/prayer-wall-api')
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { useWatchMode } from '@/hooks/useWatchMode'

function makePost(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 'p-answered-1',
    userId: 'u1',
    authorName: 'Sarah',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Please pray for my mother.',
    category: 'health',
    postType: 'prayer_request',
    isAnswered: true,
    answeredText: "She's home from the hospital and recovering well.",
    answeredAt: '2026-05-11T14:00:00Z',
    createdAt: '2026-05-08T09:00:00Z',
    lastActivityAt: '2026-05-11T14:00:00Z',
    prayingCount: 12,
    praisingCount: 0,
    commentCount: 3,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall/answered']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AnsweredWall />
    </MemoryRouter>,
  )
}

describe('AnsweredWall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reactions hook init() hydrates via getMyReactions + listMyBookmarks;
    // mock both so unhandled rejections don't surface.
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
    vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
      posts: [],
      pagination: { page: 1, limit: 100, total: 0, hasMore: false },
    })
  })

  it('renders heading and subhead from the Copy Deck (Spec acceptance A)', async () => {
    vi.mocked(prayerWallApi.listPosts).mockResolvedValueOnce({
      posts: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
    })
    renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Answered' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Prayers the community has watched God move in.'),
    ).toBeInTheDocument()
  })

  it('calls listPosts with sort="answered" (no new endpoint per Discovery #1)', async () => {
    vi.mocked(prayerWallApi.listPosts).mockResolvedValueOnce({
      posts: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
    })
    renderPage()
    await waitFor(() => {
      expect(prayerWallApi.listPosts).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'answered' }),
      )
    })
  })

  it('renders one AnsweredCard per post in the feed (Spec acceptance B)', async () => {
    const fixtures = [
      makePost({ id: 'p1' }),
      makePost({
        id: 'p2',
        content: 'Praying for direction on a job decision.',
        answeredText: 'I got the offer and accepted. Praising God.',
      }),
    ]
    vi.mocked(prayerWallApi.listPosts).mockResolvedValueOnce({
      posts: fixtures,
      pagination: { page: 1, limit: 20, total: 2, hasMore: false },
    })
    renderPage()
    // Two answer-text regions — one per AnsweredCard variant.
    await waitFor(() => {
      const regions = screen.getAllByRole('region', {
        name: 'How this was answered',
      })
      expect(regions).toHaveLength(2)
    })
  })

  it('renders the empty state copy when the feed has zero posts (Spec acceptance G)', async () => {
    vi.mocked(prayerWallApi.listPosts).mockResolvedValueOnce({
      posts: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
    })
    renderPage()
    // FeatureEmptyState renders the heading as an <h3> and the description
    // as a <p>; both start with "No answered prayers yet". Assert on the
    // <h3> heading explicitly to avoid ambiguity.
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: 'No answered prayers yet' }),
      ).toBeInTheDocument()
    })
    // The description carries the full empty-state copy from D-Copy.
    expect(
      screen.getByText(
        /When someone marks a prayer answered, their testimony will live here/i,
      ),
    ).toBeInTheDocument()
  })

  it('has exactly one <h1> on the page (Gate-G-A11Y heading hierarchy)', async () => {
    vi.mocked(prayerWallApi.listPosts).mockResolvedValueOnce({
      posts: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
    })
    renderPage()
    await waitFor(() => {
      const h1s = screen.getAllByRole('heading', { level: 1 })
      expect(h1s).toHaveLength(1)
      expect(h1s[0]).toHaveTextContent('Answered')
    })
  })

  it('mounts CrisisResourcesBanner when watch mode is active (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE)', async () => {
    vi.mocked(useWatchMode).mockReturnValue({ active: true })
    vi.mocked(prayerWallApi.listPosts).mockResolvedValueOnce({
      posts: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
    })
    renderPage()
    // CrisisResourcesBanner uses role="region" + aria-labelledby pointing at
    // its heading; the heading id is 'watch-crisis-resources-heading' but the
    // accessible name is the visible heading text "If you need to talk to
    // someone right now". Asserting on a stable string-anchored region keeps
    // the test resilient to copy churn that doesn't change the contract.
    await waitFor(() => {
      // The banner heading uses WATCH_CRISIS_BANNER_COPY.heading — the 988
      // phone number is the canonical first focusable element inside.
      const phoneLinks = screen
        .getAllByRole('link')
        .filter((l) => l.getAttribute('href')?.startsWith('tel:'))
      expect(phoneLinks.length).toBeGreaterThan(0)
    })
  })
})
