import { render, screen, within } from '@testing-library/react'
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

  it('renders skip-to-content link', () => {
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
      screen.getByRole('region', { name: /your journey to/i })
    ).toBeInTheDocument()
    // Growth Teasers
    expect(
      screen.getByRole('region', { name: /see how you're growing/i })
    ).toBeInTheDocument()
    // Quiz
    expect(
      screen.getByRole('region', { name: /not sure where to start/i })
    ).toBeInTheDocument()
  })

  describe('DevotionalTeaser', () => {
    it('renders "Daily Devotional" label in teaser section', () => {
      renderHome()
      // Scope to the teaser section (not the navbar link)
      const headings = screen.getAllByText('Daily Devotional')
      // At least one should be in the teaser section (p element with uppercase label style)
      const teaserLabel = headings.find((el) => el.tagName === 'P')
      expect(teaserLabel).toBeInTheDocument()
    })

    it('renders "Start Each Morning with God" heading', () => {
      renderHome()
      expect(
        screen.getByRole('heading', { name: /Start Each Morning with God/i })
      ).toBeInTheDocument()
    })

    it('shows today\'s devotional title', () => {
      renderHome()
      expect(screen.getByText(/^Today:/)).toBeInTheDocument()
    })

    it('CTA links to /devotional', () => {
      renderHome()
      const heading = screen.getByRole('heading', { name: /Start Each Morning with God/i })
      const section = heading.closest('section')!
      const ctaLink = within(section).getByRole('link', { name: /Read Today/i })
      expect(ctaLink).toHaveAttribute('href', '/devotional')
    })
  })
})
