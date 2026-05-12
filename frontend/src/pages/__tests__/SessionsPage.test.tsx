import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/services/api/sessions-api', () => ({
  listSessionsApi: vi.fn(),
  revokeSessionApi: vi.fn(),
  revokeAllOtherSessionsApi: vi.fn(),
  revokeAllSessionsApi: vi.fn(),
}))

// Mock useAuth via a mutable state object so individual tests can drive
// `isAuthResolving` and `isAuthenticated` independently. Default = resolved
// + authenticated (matches the original test setup).
const authState = {
  isAuthenticated: true,
  isAuthResolving: false,
  user: { id: 'u1', name: 'Alice' } as { id: string; name: string } | null,
}
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/components/Navbar', () => ({
  Navbar: () => <nav data-testid="mock-navbar" />,
}))

vi.mock('@/components/SiteFooter', () => ({
  SiteFooter: () => <footer data-testid="mock-footer" />,
}))

vi.mock('@/components/SEO', () => ({
  SEO: () => null,
}))

vi.mock('@/components/ui/Toast', () => {
  const showToast = vi.fn()
  return {
    useToast: () => ({ showToast }),
  }
})

vi.mock('@/lib/auth-storage', () => ({
  clearStoredToken: vi.fn(),
}))

import { listSessionsApi, revokeAllOtherSessionsApi } from '@/services/api/sessions-api'
import { SessionsPage } from '../SessionsPage'
import { SESSIONS_COPY } from '@/constants/sessions-copy'
import type { Session } from '@/types/api/sessions'

const buildSession = (overrides: Partial<Session> = {}): Session => ({
  sessionId: 'session-1',
  deviceLabel: 'Chrome 124 on macOS 14',
  ipCity: 'Brooklyn',
  lastSeenAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  isCurrent: false,
  ...overrides,
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/sessions']}>
      <SessionsPage />
    </MemoryRouter>,
  )
}

describe('SessionsPage — Spec 1.5g', () => {
  beforeEach(() => {
    vi.mocked(listSessionsApi).mockReset()
    vi.mocked(revokeAllOtherSessionsApi).mockReset()
    // Reset auth state to default — resolved + authenticated.
    authState.isAuthenticated = true
    authState.isAuthResolving = false
    authState.user = { id: 'u1', name: 'Alice' }
  })

  it('renders page title and subtitle', async () => {
    vi.mocked(listSessionsApi).mockResolvedValue([
      buildSession({ isCurrent: true }),
      buildSession({ sessionId: 'session-2', deviceLabel: 'Safari 17 on iOS 17' }),
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: SESSIONS_COPY.pageTitle })).toBeInTheDocument()
    })
    expect(screen.getByText(SESSIONS_COPY.pageSubtitle)).toBeInTheDocument()
  })

  it('renders one row per session and shows "This device" badge on current row', async () => {
    vi.mocked(listSessionsApi).mockResolvedValue([
      buildSession({ sessionId: 'a', isCurrent: true }),
      buildSession({ sessionId: 'b', deviceLabel: 'Safari 17 on iOS 17' }),
    ])

    renderPage()

    // Two device labels render
    await waitFor(() => {
      expect(screen.getByText('Chrome 124 on macOS 14')).toBeInTheDocument()
      expect(screen.getByText('Safari 17 on iOS 17')).toBeInTheDocument()
    })
    // Only one "This device" badge
    const badges = screen.getAllByText(SESSIONS_COPY.thisDevice)
    expect(badges).toHaveLength(1)
  })

  it('shows empty state when only the current session exists', async () => {
    vi.mocked(listSessionsApi).mockResolvedValue([
      buildSession({ isCurrent: true }),
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(SESSIONS_COPY.emptyState)).toBeInTheDocument()
    })
    // No bulk action buttons when only one session
    expect(
      screen.queryByRole('button', { name: SESSIONS_COPY.signOutOthers }),
    ).not.toBeInTheDocument()
  })

  it('shows error banner on fetch failure', async () => {
    vi.mocked(listSessionsApi).mockRejectedValue(new Error('boom'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(SESSIONS_COPY.loadError)).toBeInTheDocument()
    })
  })

  it('opens the confirmation dialog when Sign Out Everywhere is clicked', async () => {
    vi.mocked(listSessionsApi).mockResolvedValue([
      buildSession({ isCurrent: true }),
      buildSession({ sessionId: 'b' }),
    ])

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: SESSIONS_COPY.signOutEverywhere }),
      ).toBeInTheDocument()
    })

    await userEvent.click(
      screen.getByRole('button', { name: SESSIONS_COPY.signOutEverywhere }),
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(SESSIONS_COPY.confirmEverywhereBody)).toBeInTheDocument()
  })

  it('calls the bulk-others endpoint when "Sign out other devices" is clicked', async () => {
    vi.mocked(listSessionsApi).mockResolvedValue([
      buildSession({ isCurrent: true }),
      buildSession({ sessionId: 'b' }),
    ])
    vi.mocked(revokeAllOtherSessionsApi).mockResolvedValue(undefined)

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: SESSIONS_COPY.signOutOthers }),
      ).toBeInTheDocument()
    })

    await userEvent.click(
      screen.getByRole('button', { name: SESSIONS_COPY.signOutOthers }),
    )

    await waitFor(() => {
      expect(revokeAllOtherSessionsApi).toHaveBeenCalledTimes(1)
    })
  })

  // Auth-resolving fix (Spec 1.5g verification report Issue #2). The outer
  // SessionsPage must defer both the redirect AND the sessions API call
  // until AuthContext finishes hydrating from /users/me. Otherwise real-JWT
  // users bounce through /?auth=login on every page reload.

  it('renders skeleton (no API call, no redirect) while auth is resolving', async () => {
    authState.isAuthResolving = true
    authState.isAuthenticated = false
    authState.user = null

    renderPage()

    // Skeleton announcer present.
    expect(screen.getByText('Loading active sessions')).toBeInTheDocument()
    // Real page content NOT rendered yet.
    expect(
      screen.queryByRole('heading', { name: SESSIONS_COPY.pageTitle }),
    ).not.toBeInTheDocument()
    // CRITICAL: useSessions must NOT have fired — calling /api/v1/sessions
    // before AuthContext attaches the Bearer header would 401 and trigger
    // a spurious logout via the wr:auth-invalidated event chain.
    expect(listSessionsApi).not.toHaveBeenCalled()
  })

  it('renders content after auth resolves (post-skeleton)', async () => {
    authState.isAuthResolving = false
    authState.isAuthenticated = true
    vi.mocked(listSessionsApi).mockResolvedValue([buildSession({ isCurrent: true })])

    renderPage()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: SESSIONS_COPY.pageTitle }),
      ).toBeInTheDocument()
    })
    expect(listSessionsApi).toHaveBeenCalledTimes(1)
  })
})
