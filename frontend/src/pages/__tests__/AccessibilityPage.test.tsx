import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AccessibilityPage } from '@/pages/AccessibilityPage'

// Mock providers that Navbar/Layout need
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}))
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}))
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  AuthModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuthModal: () => null,
}))
vi.mock('@/lib/audio', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAudio: () => ({ state: { isPlaying: false, drawerOpen: false }, dispatch: vi.fn() }),
}))
vi.mock('@/components/SEO', () => ({
  SEO: () => null,
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/accessibility']}>
      <AccessibilityPage />
    </MemoryRouter>,
  )
}

describe('AccessibilityPage', () => {
  it('renders h1 and all five h2 sections', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: /our commitment to accessibility/i }),
    ).toBeInTheDocument()

    const expectedH2s = [
      'Accessibility Standard',
      'What We Have Done',
      'Known Limitations',
      'Feedback',
      'Last Audit',
    ]

    for (const text of expectedH2s) {
      expect(
        screen.getByRole('heading', { level: 2, name: new RegExp(text, 'i') }),
      ).toBeInTheDocument()
    }
  })

  it('has exactly one h1', () => {
    renderPage()

    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
  })

  it('has no heading level gaps (h1 then h2 only) within page content', () => {
    const { container } = renderPage()

    // Scope to the page content area (max-w-3xl wrapper) to exclude
    // Layout chrome headings (e.g. SiteFooter h3s)
    const contentArea = container.querySelector('.max-w-3xl')!
    expect(contentArea).toBeTruthy()

    const pageHeadings = Array.from(contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    const levels = pageHeadings.map((el) => Number(el.tagName.replace('H', '')))

    // First heading must be h1
    expect(levels[0]).toBe(1)

    // Every subsequent heading in the page content must be h2 (no gaps)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBe(2)
    }

    // No jump larger than 1 from any heading to the next
    for (let i = 1; i < levels.length; i++) {
      const gap = levels[i] - levels[i - 1]
      expect(gap).toBeLessThanOrEqual(1)
    }
  })

  it('has an email feedback link to accessibility@worshiproom.com', () => {
    renderPage()

    const link = screen.getByRole('link', { name: /accessibility@worshiproom\.com/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'mailto:accessibility@worshiproom.com')
  })

  it('renders at /accessibility route without errors', () => {
    // This verifies the component mounts cleanly with our MemoryRouter entry
    const { container } = renderPage()
    expect(container.querySelector('h1')).toBeTruthy()
  })

  it('h1 has an accessible name', () => {
    renderPage()

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveAccessibleName('Our Commitment to Accessibility')
  })
})
