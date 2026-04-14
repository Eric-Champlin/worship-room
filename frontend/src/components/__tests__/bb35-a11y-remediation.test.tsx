/**
 * BB-35 Accessibility Audit — Remediation Tests
 *
 * Verifies accessibility fixes shipped as part of the BB-35 audit:
 * skip link, main landmark, icon accessibility, heading hierarchy,
 * footer a11y link, and screen reader names.
 */
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Navbar } from '@/components/Navbar'
import { Layout } from '@/components/Layout'
import { SiteFooter } from '@/components/SiteFooter'
import { AccessibilityPage } from '@/pages/AccessibilityPage'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// ---------- Mocks ----------

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: vi.fn(() => ({
    currentSeason: { name: 'Ordinary Time', themeColor: '#6D28D9', icon: '', greeting: '' },
    seasonName: 'Ordinary Time',
    themeColor: '#6D28D9',
    icon: '',
    greeting: '',
    daysUntilNextSeason: 30,
    isNamedSeason: false,
  })),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', async () => {
  const actual = await vi.importActual<typeof import('@/components/prayer-wall/AuthModalProvider')>(
    '@/components/prayer-wall/AuthModalProvider',
  )
  return {
    ...actual,
    useAuthModal: vi.fn(() => ({ openAuthModal: vi.fn() })),
  }
})

vi.mock('@/hooks/useNotificationActions', () => ({
  useNotificationActions: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    clearNotification: vi.fn(),
  })),
}))

// ---------- Helpers ----------

const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const

function renderWithProviders(ui: React.ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]} future={ROUTER_FUTURE}>
      <ToastProvider>
        <AuthModalProvider>
          {ui}
          <Routes>
            <Route path="*" element={null} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

function renderFooter() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <SiteFooter />
    </MemoryRouter>,
  )
}

function renderAccessibilityPage() {
  return render(
    <MemoryRouter initialEntries={['/accessibility']} future={ROUTER_FUTURE}>
      <ToastProvider>
        <AuthModalProvider>
          <AccessibilityPage />
          <Routes>
            <Route path="*" element={null} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

// =================================================================
// 1. Skip Link in Navbar
// =================================================================

describe('BB-35: Skip link in Navbar', () => {
  it('renders a skip link with text "Skip to content"', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText('Skip to content')).toBeInTheDocument()
  })

  it('skip link has href="#main-content"', () => {
    renderWithProviders(<Navbar />)
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('skip link has sr-only class for visual hiding', () => {
    renderWithProviders(<Navbar />)
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink.className).toContain('sr-only')
  })
})

// =================================================================
// 2. Layout provides main-content target
// =================================================================

describe('BB-35: Layout main landmark', () => {
  it('renders <main id="main-content"> landmark', () => {
    renderWithProviders(
      <Layout>
        <p>Child content</p>
      </Layout>,
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
  })
})

// =================================================================
// 3. Navbar navigation accessibility
// =================================================================

describe('BB-35: Navbar navigation accessible names', () => {
  it('nav links have accessible names matching their labels', () => {
    renderWithProviders(<Navbar />)
    const expectedLinks = ['Daily Hub', 'Bible', 'Grow', 'Prayer Wall', 'Music']
    for (const name of expectedLinks) {
      const link = screen.getByRole('link', { name })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('aria-label', name)
    }
  })

  it('hamburger button has a descriptive aria-label', () => {
    renderWithProviders(<Navbar />)
    const hamburger = screen.getByRole('button', { name: /open menu/i })
    expect(hamburger).toHaveAttribute('aria-label')
  })

  it('logo link has aria-label "Worship Room home"', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByLabelText('Worship Room home')).toBeInTheDocument()
  })
})

// =================================================================
// 4. Decorative icons have aria-hidden
// =================================================================

describe('BB-35: Decorative icons have aria-hidden', () => {
  it('hamburger menu icons are marked aria-hidden="true"', () => {
    renderWithProviders(<Navbar />)
    const hamburger = screen.getByRole('button', { name: /open menu/i })
    const svg = hamburger.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('footer badge SVGs are marked aria-hidden="true"', () => {
    renderFooter()
    const footer = screen.getByRole('contentinfo')
    const svgs = footer.querySelectorAll('svg[aria-hidden="true"]')
    // AppStoreBadge, GooglePlayBadge, and SpotifyBadge SVGs should all be decorative
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })
})

// =================================================================
// 5. Heading hierarchy
// =================================================================

describe('BB-35: Heading hierarchy', () => {
  it('AccessibilityPage renders exactly one h1', () => {
    renderAccessibilityPage()
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent(/accessibility/i)
  })

  it('AccessibilityPage h2s follow the h1 without level gaps', () => {
    renderAccessibilityPage()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()

    // There should be multiple h2 subsections
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.length).toBeGreaterThanOrEqual(3)

    // Ensure no h3 or h4 appears without a preceding h2
    // (the AccessibilityPage should have h1 -> h2 only, no h3s)
    // Footer renders h3s (column headings), which are inside the footer landmark, not the main content
    // So filter to only h3s inside main content
    const main = screen.getByRole('main')
    const mainH3s = within(main).queryAllByRole('heading', { level: 3 })
    expect(mainH3s).toHaveLength(0)
  })

  it('SiteFooter column headings are h3 (appropriate within the document outline)', () => {
    renderFooter()
    const footer = screen.getByRole('contentinfo')
    const h3s = within(footer).getAllByRole('heading', { level: 3 })
    expect(h3s.length).toBeGreaterThanOrEqual(3)
    expect(h3s.map((h) => h.textContent)).toEqual(
      expect.arrayContaining(['Daily', 'Music', 'Support']),
    )
  })
})

// =================================================================
// 6. Footer Accessibility link
// =================================================================

describe('BB-35: Footer Accessibility link', () => {
  it('SiteFooter contains an "Accessibility" link to /accessibility', () => {
    renderFooter()
    const link = screen.getByRole('link', { name: 'Accessibility' })
    expect(link).toHaveAttribute('href', '/accessibility')
  })
})

// =================================================================
// 7. Screen reader matchers (accessible names)
// =================================================================

describe('BB-35: Screen reader accessible names', () => {
  it('Navbar navigation element has accessible name "Main navigation"', () => {
    renderWithProviders(<Navbar />)
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toHaveAccessibleName('Main navigation')
  })

  it('AccessibilityPage h1 has accessible name containing "Accessibility"', () => {
    renderAccessibilityPage()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveAccessibleName(/accessibility/i)
  })
})
