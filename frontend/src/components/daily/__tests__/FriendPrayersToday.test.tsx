import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { FriendPrayersToday } from '../FriendPrayersToday'
import type { PrayerRequest } from '@/types/prayer-wall'

// ─── Mocks ─────────────────────────────────────────────────────────────

const mockRecordActivity = vi.fn()
let mockIsAuthenticated = true
let mockPosts: PrayerRequest[] = []
let mockIsLoading = false
let mockError: unknown = null
let mockHasCrisisFlag = false
const mockDismissPost = vi.fn()
const mockRefetch = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockIsAuthenticated
      ? { id: 'viewer-id', name: 'Viewer', userId: 'viewer-id', displayName: 'Viewer' }
      : null,
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
    todayActivities: {},
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: mockRecordActivity,
  }),
}))

vi.mock('@/hooks/useFriendPrayersToday', () => ({
  useFriendPrayersToday: (enabled: boolean) => {
    if (!enabled) {
      return {
        posts: [],
        isLoading: false,
        error: null,
        hasCrisisFlag: false,
        refetch: mockRefetch,
        dismissPost: mockDismissPost,
      }
    }
    return {
      posts: mockPosts,
      isLoading: mockIsLoading,
      error: mockError,
      hasCrisisFlag: mockHasCrisisFlag,
      refetch: mockRefetch,
      dismissPost: mockDismissPost,
    }
  },
}))

// QuickLiftOverlay is mocked so this test does not depend on Spec 6.2's
// network calls or 30-second dwell timer.
let capturedOverlayProps: {
  isOpen?: boolean
  postId?: string
  postExcerpt?: string
  onCancel?: () => void
  onComplete?: () => void
} | null = null

vi.mock('@/components/prayer-wall/QuickLiftOverlay', () => ({
  QuickLiftOverlay: (props: {
    isOpen: boolean
    postId: string
    postExcerpt: string
    onCancel: () => void
    onComplete: () => void
  }) => {
    capturedOverlayProps = props
    return (
      <div data-testid="quick-lift-overlay-mock">
        <span data-testid="quick-lift-postid">{props.postId}</span>
        <button
          data-testid="quick-lift-complete-button"
          onClick={() => props.onComplete()}
        >
          complete
        </button>
        <button data-testid="quick-lift-cancel-button" onClick={() => props.onCancel()}>
          cancel
        </button>
      </div>
    )
  },
}))

// ─── Test fixture helpers ──────────────────────────────────────────────

function buildPost(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 'post-' + Math.random().toString(36).slice(2, 8),
    userId: 'author-1',
    authorName: 'Sarah',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Please pray for my family.',
    category: 'family',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    lastActivityAt: new Date().toISOString(),
    prayingCount: 0,
    commentCount: 0,
    postType: 'prayer_request',
    ...overrides,
  }
}

function renderComponent() {
  return render(
    <MemoryRouter>
      <FriendPrayersToday />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockIsAuthenticated = true
  mockPosts = []
  mockIsLoading = false
  mockError = null
  mockHasCrisisFlag = false
  mockRecordActivity.mockClear()
  mockDismissPost.mockClear()
  mockRefetch.mockClear()
  capturedOverlayProps = null
})

// ─── Tests ─────────────────────────────────────────────────────────────

describe('FriendPrayersToday', () => {
  // Test 13: G-UNAUTHENTICATED-NO-RENDER
  it('renders nothing when unauthenticated', () => {
    mockIsAuthenticated = false
    const { container } = renderComponent()
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/from your friends today/i)).not.toBeInTheDocument()
  })

  // Test 14: G-EMPTY-STATE-PROPER-COPY
  it("renders empty-state copy when no friend posts are returned", () => {
    mockPosts = []
    renderComponent()
    expect(
      screen.getByRole('heading', { name: /from your friends today/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /your friends haven't shared anything today/i,
      ),
    ).toBeInTheDocument()
  })

  // Test 15: G-MAX-THREE-POSTS + G-ANONYMOUS-AUTHORS-RESPECTED
  it('renders up to three cards including the anonymous author label', () => {
    mockPosts = [
      buildPost({ id: 'p1', authorName: 'Sarah', content: 'Please pray for healing.' }),
      buildPost({ id: 'p2', authorName: 'Bob', content: 'I am struggling.' }),
      buildPost({
        id: 'p3',
        // PostMapper.anonymousAuthor() always returns authorName='Anonymous'
        // regardless of underlying user_id, so the card renders the literal
        // "Anonymous" string (Gate-G-ANONYMOUS-AUTHORS-RESPECTED).
        authorName: 'Anonymous',
        isAnonymous: true,
        content: 'A quiet prayer request.',
      }),
    ]
    renderComponent()
    expect(screen.getByText('Sarah')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    // All three Lift buttons render. The button label is 'Lift'.
    expect(screen.getAllByRole('button', { name: /quick lift in prayer/i })).toHaveLength(3)
  })

  // Test 16: G-QUICK-LIFT-INLINE
  it('opens QuickLiftOverlay when the Lift button is clicked', async () => {
    const user = userEvent.setup()
    mockPosts = [buildPost({ id: 'p-quick-lift', content: 'Pray for me.' })]
    renderComponent()

    // Overlay is not mounted until a card is tapped.
    expect(screen.queryByTestId('quick-lift-overlay-mock')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /quick lift in prayer/i }))

    expect(screen.getByTestId('quick-lift-overlay-mock')).toBeInTheDocument()
    expect(screen.getByTestId('quick-lift-postid')).toHaveTextContent('p-quick-lift')
    expect(capturedOverlayProps?.postExcerpt).toBe('Pray for me.')
  })

  // Test 17: G-CARD-DISMISSAL-POST-LIFT
  it('records the quickLift activity and dismisses the post on overlay completion', async () => {
    const user = userEvent.setup()
    mockPosts = [buildPost({ id: 'p-dismiss', content: 'Pray for the mission.' })]
    renderComponent()

    await user.click(screen.getByRole('button', { name: /quick lift in prayer/i }))
    await user.click(screen.getByTestId('quick-lift-complete-button'))

    // Backend records the activity in the /complete transaction; we pass
    // skipBackendDualWrite to prevent double-insertion.
    expect(mockRecordActivity).toHaveBeenCalledWith(
      'quickLift',
      'friend-prayers-today',
      { skipBackendDualWrite: true },
    )
    expect(mockDismissPost).toHaveBeenCalledWith('p-dismiss')
  })

  // Loading state — section heading + sr-only loading label render with
  // aria-busy on the skeleton wrapper.
  it('renders the loading skeleton while isLoading is true', () => {
    mockIsLoading = true
    renderComponent()
    expect(
      screen.getByRole('heading', { name: /from your friends today/i }),
    ).toBeInTheDocument()
    // The sr-only label inside the aria-busy region announces loading state
    // to screen readers.
    expect(screen.getByText(/loading friend prayers/i)).toBeInTheDocument()
  })

  // Error state — soft failure renders nothing. Anti-pressure: an inline
  // error banner on the Pray tab would feel intrusive; the next mount
  // retries automatically.
  it('renders nothing when the hook returns an error', () => {
    mockError = new Error('Network failure')
    const { container } = renderComponent()
    expect(container).toBeEmptyDOMElement()
  })

  // Gate-G-CRISIS-FLAG-HANDLING — when the aggregate crisis flag is true,
  // a CrisisResourcesBanner mounts above the section heading regardless of
  // whether posts are present. Mirrors the Spec 6.11b PrayerWall pattern
  // (per-post crisisFlag is intentionally stripped by Phase 3 Addendum #7,
  // so the aggregate signal is the available safety net).
  it('renders CrisisResourcesBanner above posts when hasCrisisFlag is true', () => {
    mockHasCrisisFlag = true
    mockPosts = [
      buildPost({ id: 'p-crisis', content: 'I am struggling tonight.' }),
    ]
    renderComponent()
    expect(
      screen.getByRole('link', { name: /call 988/i }),
    ).toBeInTheDocument()
    // Friend prayer card still renders alongside the banner.
    expect(screen.getByText('Sarah')).toBeInTheDocument()
  })

  it('renders CrisisResourcesBanner in the empty state when hasCrisisFlag is true', () => {
    mockHasCrisisFlag = true
    mockPosts = []
    renderComponent()
    expect(
      screen.getByRole('link', { name: /call 988/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/your friends haven't shared anything today/i),
    ).toBeInTheDocument()
  })

  it('omits CrisisResourcesBanner when hasCrisisFlag is false', () => {
    mockHasCrisisFlag = false
    mockPosts = [buildPost({ id: 'p-normal' })]
    renderComponent()
    expect(
      screen.queryByRole('link', { name: /call 988/i }),
    ).not.toBeInTheDocument()
  })
})
