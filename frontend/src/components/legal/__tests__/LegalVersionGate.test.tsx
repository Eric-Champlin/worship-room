import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks (defined BEFORE imports of the component-under-test).
// ---------------------------------------------------------------------------

const mockUseAuth = vi.fn()
const refreshUserMock = vi.fn(async () => {})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseLegalVersions = vi.fn()
vi.mock('@/hooks/useLegalVersions', () => ({
  useLegalVersions: () => mockUseLegalVersions(),
  __resetLegalVersionsCache: () => {},
}))

const acceptLegalVersionsApiMock = vi.fn(async () => {})
vi.mock('@/services/api/legal-api', () => ({
  acceptLegalVersionsApi: (terms: string, privacy: string) =>
    acceptLegalVersionsApiMock(terms, privacy),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

// useFocusTrap is imported by TermsUpdateModal — mock it to a passthrough
// ref so Tab handling and previously-focused restore don't interfere.
vi.mock('@/hooks/useFocusTrap', async () => {
  const { useRef } = await import('react')
  return {
    useFocusTrap: (_isActive: boolean, _onEscape?: () => void) => useRef(null),
  }
})

import { LegalVersionGate, useLegalVersionGate } from '../LegalVersionGate'

const CURRENT = {
  termsVersion: '2026-04-29',
  privacyVersion: '2026-04-29',
  communityGuidelinesVersion: '2026-04-29',
}

const STALE_USER = {
  id: 'user-1',
  name: 'Sarah',
  displayName: 'Sarah',
  email: 'sarah@example.com',
  firstName: 'Sarah',
  lastName: 'Smith',
  isAdmin: false,
  timezone: 'UTC',
  isEmailVerified: false,
  termsVersion: '2025-01-01', // older than current
  privacyVersion: '2025-01-01',
}

const CURRENT_USER = {
  ...STALE_USER,
  termsVersion: '2026-04-29',
  privacyVersion: '2026-04-29',
}

function setAuth(authenticated: boolean, user: typeof STALE_USER | null) {
  mockUseAuth.mockReturnValue({
    isAuthenticated: authenticated,
    user,
    refreshUser: refreshUserMock,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    simulateLegacyAuth: vi.fn(),
    isAuthResolving: false,
  })
}

function setVersions(
  versions: typeof CURRENT | null,
  isLoading = false,
  error: Error | null = null,
) {
  mockUseLegalVersions.mockReturnValue({ versions, isLoading, error })
}

function Wrapper({ children }: { children: ReactNode }) {
  return <LegalVersionGate>{children}</LegalVersionGate>
}

describe('LegalVersionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    refreshUserMock.mockResolvedValue(undefined)
    acceptLegalVersionsApiMock.mockResolvedValue(undefined)
    setAuth(true, CURRENT_USER)
    setVersions(CURRENT)
  })

  it('does not render the modal when versions match', () => {
    render(
      <Wrapper>
        <div>app content</div>
      </Wrapper>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('app content')).toBeInTheDocument()
  })

  it('renders the modal when termsVersion is stale', () => {
    setAuth(true, { ...CURRENT_USER, termsVersion: '2025-01-01' })
    render(
      <Wrapper>
        <div>app content</div>
      </Wrapper>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /we updated our terms\./i }),
    ).toBeInTheDocument()
  })

  it('renders the modal when privacyVersion is stale', () => {
    setAuth(true, { ...CURRENT_USER, privacyVersion: '2025-01-01' })
    render(
      <Wrapper>
        <div>app content</div>
      </Wrapper>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('"Later" dismisses the modal for the session', async () => {
    const user = userEvent.setup()
    setAuth(true, STALE_USER)
    render(
      <Wrapper>
        <div>app content</div>
      </Wrapper>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /later/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // App content remains rendered — the gate never blocks rendering.
    expect(screen.getByText('app content')).toBeInTheDocument()
  })

  it('queueAndShow re-shows the modal after dismissal and replays the action on accept', async () => {
    const user = userEvent.setup()
    setAuth(true, STALE_USER)

    const queuedAction = vi.fn()

    function GatedTrigger() {
      const gate = useLegalVersionGate()
      return (
        <button
          type="button"
          onClick={() => gate.queueAndShow(queuedAction)}
          data-testid="gated-trigger"
        >
          fire gated action
        </button>
      )
    }

    render(
      <Wrapper>
        <GatedTrigger />
      </Wrapper>,
    )

    // Dismiss the boot-time modal first.
    await user.click(screen.getByRole('button', { name: /later/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // queueAndShow must re-open the modal even though the user dismissed it.
    await user.click(screen.getByTestId('gated-trigger'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(queuedAction).not.toHaveBeenCalled()

    // Walk the accept flow: notice → accept-form → check the box → Accept.
    await user.click(screen.getByRole('button', { name: /review and accept/i }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /^accept$/i }))

    await waitFor(() => {
      expect(acceptLegalVersionsApiMock).toHaveBeenCalledWith(
        '2026-04-29',
        '2026-04-29',
      )
    })
    await waitFor(() => {
      expect(refreshUserMock).toHaveBeenCalled()
    })

    // The provider replays the queued action on the next tick. Wait for it.
    await waitFor(() => {
      expect(queuedAction).toHaveBeenCalledTimes(1)
    })
  })

  it('dismissing without accepting drops any queued action', async () => {
    const user = userEvent.setup()
    setAuth(true, STALE_USER)

    const queuedAction = vi.fn()

    function GatedTrigger() {
      const gate = useLegalVersionGate()
      return (
        <button
          type="button"
          onClick={() => gate.queueAndShow(queuedAction)}
          data-testid="gated-trigger"
        >
          fire gated action
        </button>
      )
    }

    render(
      <Wrapper>
        <GatedTrigger />
      </Wrapper>,
    )

    // Dismiss the boot modal.
    await user.click(screen.getByRole('button', { name: /later/i }))
    // Queue an action — modal re-opens.
    await user.click(screen.getByTestId('gated-trigger'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Dismiss again without accepting — queued action should drop.
    await user.click(screen.getByRole('button', { name: /later/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Give any latent setTimeout a chance to fire (it should not).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5))
    })
    expect(queuedAction).not.toHaveBeenCalled()
  })

  it('returns false for isStaleAcceptance while versions are loading', () => {
    setAuth(true, STALE_USER)
    setVersions(null, true) // isLoading
    render(
      <Wrapper>
        <div>app content</div>
      </Wrapper>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not render the modal for unauthenticated visitors', () => {
    setAuth(false, null)
    render(
      <Wrapper>
        <div>app content</div>
      </Wrapper>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
