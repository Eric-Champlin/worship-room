import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthQueryParamHandler } from '@/components/AuthQueryParamHandler'
import { SESSIONS_COPY } from '@/constants/sessions-copy'

const mockOpenAuthModal = vi.fn()
const mockShowToast = vi.fn()

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({ showToast: mockShowToast, showCelebrationToast: vi.fn() }),
}))

function Locator() {
  const location = useLocation()
  return (
    <div
      data-testid="locator"
      data-pathname={location.pathname}
      data-search={location.search}
    />
  )
}

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthQueryParamHandler />
      <Routes>
        <Route path="*" element={<Locator />} />
      </Routes>
    </MemoryRouter>,
  )
}

function getSearch(): string {
  return screen.getByTestId('locator').getAttribute('data-search') ?? ''
}

function getPathname(): string {
  return screen.getByTestId('locator').getAttribute('data-pathname') ?? ''
}

describe('AuthQueryParamHandler', () => {
  beforeEach(() => {
    mockOpenAuthModal.mockClear()
    mockShowToast.mockClear()
  })

  it('opens AuthModal in login view when ?auth=login', async () => {
    renderAt('/?auth=login')
    await waitFor(() => {
      expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'login')
    })
  })

  it('opens AuthModal in register view when ?auth=register', async () => {
    renderAt('/?auth=register')
    await waitFor(() => {
      expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
    })
  })

  it('strips the auth param after opening (no other params)', async () => {
    renderAt('/?auth=login')
    await waitFor(() => {
      expect(getSearch()).toBe('')
    })
    expect(getPathname()).toBe('/')
  })

  it('preserves other query params when stripping auth', async () => {
    renderAt('/?auth=login&utm=email1')
    await waitFor(() => {
      expect(getSearch()).toBe('?utm=email1')
    })
    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'login')
  })

  it('ignores unknown auth values and does not strip the param', async () => {
    renderAt('/?auth=xyz')
    // Allow any potential effect to run before asserting absence.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
    expect(getSearch()).toBe('?auth=xyz')
  })

  it('does nothing when no auth param is present', async () => {
    renderAt('/')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
    expect(getSearch()).toBe('')
  })

  it('preserves the current pathname when stripping the param', async () => {
    renderAt('/some/deep/path?auth=register&ref=share')
    await waitFor(() => {
      expect(getPathname()).toBe('/some/deep/path')
      expect(getSearch()).toBe('?ref=share')
    })
    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
  })

  // Spec 1.5g — signed-out-everywhere reason flash + idempotency.

  it('fires the signed-out-everywhere toast exactly once and strips reason param', async () => {
    renderAt('/?auth=login&reason=signed_out_everywhere')
    await waitFor(() => {
      expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'login')
      expect(getSearch()).toBe('')
    })
    // Idempotent under StrictMode's double-mount + the re-render the toast
    // state update itself triggers. Without the URL-signature ref this fires
    // 2-3 times (see Spec 1.5g verification report Issue #1).
    expect(mockShowToast).toHaveBeenCalledTimes(1)
    expect(mockShowToast).toHaveBeenCalledWith(SESSIONS_COPY.signedOutEverywhereFlash)
  })

  it('does not fire the toast when reason is missing or unknown', async () => {
    renderAt('/?auth=login&reason=some_other_reason')
    await waitFor(() => {
      expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'login')
    })
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not fire the toast when reason is set without auth param', async () => {
    renderAt('/?reason=signed_out_everywhere')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
    expect(mockShowToast).not.toHaveBeenCalled()
  })
})
