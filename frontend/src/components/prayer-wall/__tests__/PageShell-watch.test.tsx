import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock the auth hook so Navbar inside PageShell renders without auth setup
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))
vi.mock('@/hooks/useWatchMode', () => ({
  useWatchMode: vi.fn(),
}))
vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: vi.fn(),
}))

import { useWatchMode } from '@/hooks/useWatchMode'
import { useNightMode } from '@/hooks/useNightMode'
import { PageShell } from '../PageShell'

function setupMocks(watchActive: boolean) {
  ;(useWatchMode as ReturnType<typeof vi.fn>).mockReturnValue({
    active: watchActive,
    source: watchActive ? 'manual' : 'auto',
    userPreference: watchActive ? 'on' : 'off',
    degraded: true,
  })
  ;(useNightMode as ReturnType<typeof vi.fn>).mockReturnValue({
    active: false,
    source: 'auto',
    userPreference: 'auto',
  })
}

describe('PageShell crisis banner mounting (Spec 6.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts CrisisResourcesBanner when Watch is active (inherited by all 4 prayer-wall routes)', () => {
    setupMocks(true)
    render(
      <MemoryRouter>
        <PageShell>
          <main id="main-content">page content</main>
        </PageShell>
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('region', { name: /you're not alone/i }),
    ).toBeInTheDocument()
  })

  it('does NOT mount CrisisResourcesBanner when Watch is inactive', () => {
    setupMocks(false)
    render(
      <MemoryRouter>
        <PageShell>
          <main id="main-content">page content</main>
        </PageShell>
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('region', { name: /you're not alone/i }),
    ).not.toBeInTheDocument()
  })
})
