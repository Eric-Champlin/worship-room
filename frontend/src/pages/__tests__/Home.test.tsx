import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Home } from '@/pages/Home'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

function renderHome() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <Home />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('Home', () => {
  it('renders the hero heading', () => {
    renderHome()
    expect(
      screen.getByRole('heading', { level: 1, name: /how're you feeling today/i })
    ).toBeInTheDocument()
  })

  it('renders the main content landmark', () => {
    renderHome()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders skip-to-content link (via Navbar)', () => {
    renderHome()
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('renders the navbar', () => {
    renderHome()
    expect(
      screen.getByRole('navigation', { name: /main navigation/i })
    ).toBeInTheDocument()
  })

  it('renders the footer', () => {
    renderHome()
    expect(screen.getAllByRole('contentinfo').length).toBeGreaterThanOrEqual(1)
  })

  it('renders all landing page sections', () => {
    renderHome()
    // Hero
    expect(
      screen.getByRole('region', { name: /welcome to worship room/i })
    ).toBeInTheDocument()
    // Journey
    expect(
      screen.getByRole('region', { name: /your journey to healing/i })
    ).toBeInTheDocument()
    // Dashboard Preview (aria-labelledby the section heading, Spec 13)
    expect(
      screen.getByRole('region', { name: /see how you're growing/i })
    ).toBeInTheDocument()
    // Quiz
    expect(
      screen.getByRole('region', { name: /not sure where to start/i })
    ).toBeInTheDocument()
  })

  it('does NOT render removed sections (DevotionalTeaser, TodaysVerse, ChallengeBanner, SeasonalBanner)', () => {
    renderHome()
    expect(screen.queryByRole('heading', { name: /Start Each Morning with God/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Today's Verse/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Join the Challenge/i)).not.toBeInTheDocument()
  })

  it('renders FinalCTA heading', () => {
    renderHome()
    const headings = screen.getAllByRole('heading', { level: 2 })
    const ctaHeading = headings.find(
      (h) => /your healing/i.test(h.textContent ?? '') && /starts here/i.test(h.textContent ?? '')
    )
    expect(ctaHeading).toBeTruthy()
  })

  it('renders FinalCTA button', () => {
    renderHome()
    expect(
      screen.getByRole('button', { name: /get started.*free/i })
    ).toBeInTheDocument()
  })
})
