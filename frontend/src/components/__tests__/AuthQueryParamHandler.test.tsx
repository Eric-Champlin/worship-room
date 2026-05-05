import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthQueryParamHandler } from '@/components/AuthQueryParamHandler'

const mockOpenAuthModal = vi.fn()

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
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
})
