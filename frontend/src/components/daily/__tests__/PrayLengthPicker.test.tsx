import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { PrayLengthPicker } from '../PrayLengthPicker'

// Mock the auth modal hook directly. The picker only uses useAuthModal()'s
// openAuthModal action — no need to mount the real AuthModalProvider (which
// in turn needs ToastProvider).
const mockOpenAuthModal = vi.fn()
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

function simulateLogin() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'TestUser')
  localStorage.setItem('wr_user_id', 'test-id-123')
}

function LocationReader({ onChange }: { onChange: (search: string) => void }) {
  const location = useLocation()
  onChange(location.search)
  return null
}

function renderPicker(opts: { initialEntries?: string[]; onSearchChange?: (s: string) => void } = {}) {
  const initialEntries = opts.initialEntries ?? ['/daily?tab=pray']
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route
            path="/daily"
            element={
              <>
                <PrayLengthPicker />
                {opts.onSearchChange && <LocationReader onChange={opts.onSearchChange} />}
              </>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('PrayLengthPicker', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders the three length buttons with correct labels', () => {
    renderPicker()
    expect(screen.getByRole('heading', { name: 'Start a timed session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 minute, Quick pause' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 minutes, Settled prayer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10 minutes, Deep sit' })).toBeInTheDocument()
  })

  it('every button meets the 44px minimum tap target', () => {
    renderPicker()
    const buttons = screen.getAllByRole('button')
    buttons.forEach((b) => {
      expect(b.className).toContain('min-h-[44px]')
    })
  })

  it('tapping a button when authenticated updates the URL search to tab=pray&length=N', async () => {
    simulateLogin()
    let lastSearch = ''
    renderPicker({ onSearchChange: (s) => { lastSearch = s } })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '5 minutes, Settled prayer' }))
    // setSearchParams writes ?tab=pray&length=5
    expect(lastSearch).toContain('tab=pray')
    expect(lastSearch).toContain('length=5')
    // Auth modal NOT opened.
    expect(mockOpenAuthModal).not.toHaveBeenCalled()
  })

  it('tapping a button when unauthenticated opens the auth modal with the canonical subtitle and does NOT update the URL', async () => {
    let lastSearch = '?tab=pray'
    renderPicker({ onSearchChange: (s) => { lastSearch = s } })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '10 minutes, Deep sit' }))
    expect(mockOpenAuthModal).toHaveBeenCalledOnce()
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to start a timed session')
    // URL unchanged.
    expect(lastSearch).not.toContain('length=')
  })

  it('the section uses an h2 with aria-labelledby wiring', () => {
    renderPicker()
    const heading = screen.getByRole('heading', { name: 'Start a timed session' })
    expect(heading.tagName).toBe('H2')
    expect(heading.id).toBe('pray-length-picker-heading')
  })
})
