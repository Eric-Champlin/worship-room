import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CommunityGuidelines } from '@/pages/CommunityGuidelines'

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
const { seoMock } = vi.hoisted(() => ({ seoMock: vi.fn() }))
vi.mock('@/components/SEO', () => ({
  SEO: (props: { title: string; description: string }) => {
    seoMock(props)
    return null
  },
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/community-guidelines']}>
      <CommunityGuidelines />
    </MemoryRouter>,
  )
}

describe('CommunityGuidelines', () => {
  it('renders the h1 with the page title', () => {
    renderPage()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /worship room community guidelines/i,
      }),
    ).toBeInTheDocument()
  })

  it('has exactly one h1', () => {
    renderPage()

    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
  })

  it('renders all major h2 section headings from the markdown source', () => {
    renderPage()

    const expectedH2s = [
      'Welcome',
      'The shared spaces',
      "What you're welcome to share",
      'What we ask you not to share',
      'Crisis content',
      'How privacy works on Worship Room',
      'If something goes wrong',
      'How these guidelines change',
      'Last updated and version',
    ]

    for (const text of expectedH2s) {
      // Exact-name match avoids substring collisions (e.g., "Welcome" vs "What you're welcome to share")
      expect(
        screen.getByRole('heading', { level: 2, name: text }),
      ).toBeInTheDocument()
    }
  })

  it('renders h3 sub-sections within Crisis content', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { level: 3, name: /if you're in crisis right now/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /if you encounter content from another user/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /why we don't allow detailed descriptions/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders specific guidelines from the markdown source', () => {
    const { container } = renderPage()

    const contentArea = container.querySelector('.max-w-3xl') as HTMLElement
    expect(contentArea).toBeTruthy()

    // Scope to page content to avoid colliding with SiteFooter crisis-resource text
    expect(
      within(contentArea).getByText(/spam, advertising, or repeated identical posts/i),
    ).toBeInTheDocument()

    expect(
      within(contentArea).getByText(/988 suicide & crisis lifeline/i),
    ).toBeInTheDocument()

    expect(within(contentArea).getByText(/version:/i)).toBeInTheDocument()
    expect(within(contentArea).getByText(/1\.0/)).toBeInTheDocument()
  })

  it('renders support email links', () => {
    renderPage()

    const supportLinks = screen.getAllByRole('link', {
      name: /support@worshiproom\.com/i,
    })
    expect(supportLinks.length).toBeGreaterThan(0)
    for (const link of supportLinks) {
      expect(link).toHaveAttribute('href', 'mailto:support@worshiproom.com')
    }
  })

  it('renders crisis phone and SMS numbers as actionable tel: / sms: links', () => {
    const { container } = renderPage()
    const contentArea = container.querySelector('.max-w-3xl') as HTMLElement

    // Scope to the page content to avoid the SiteFooter's identical numbers
    const lifeline = within(contentArea).getByRole('link', { name: '988' })
    expect(lifeline).toHaveAttribute('href', 'tel:988')

    const textLine = within(contentArea).getByRole('link', { name: '741741' })
    expect(textLine).toHaveAttribute('href', 'sms:741741?&body=HOME')

    const samhsa = within(contentArea).getByRole('link', { name: '1-800-662-4357' })
    expect(samhsa).toHaveAttribute('href', 'tel:1-800-662-4357')

    const emergency = within(contentArea).getByRole('link', { name: '911' })
    expect(emergency).toHaveAttribute('href', 'tel:911')
  })

  it('sets the SEO title to "Community Guidelines | Worship Room"', () => {
    seoMock.mockClear()
    renderPage()

    expect(seoMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Community Guidelines | Worship Room' }),
    )
  })

  it('renders inside the Layout wrapper (footer landmark present)', () => {
    renderPage()

    // Layout mounts SiteFooter, which renders a <footer> (contentinfo landmark)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('has no heading-level gaps within the page content (h1 → h2 → h3 only)', () => {
    const { container } = renderPage()

    const contentArea = container.querySelector('.max-w-3xl')!
    expect(contentArea).toBeTruthy()

    const pageHeadings = Array.from(
      contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6'),
    )
    const levels = pageHeadings.map((el) => Number(el.tagName.replace('H', '')))

    expect(levels[0]).toBe(1)

    for (let i = 1; i < levels.length; i++) {
      const gap = levels[i] - levels[i - 1]
      expect(gap).toBeLessThanOrEqual(1)
    }
  })
})
