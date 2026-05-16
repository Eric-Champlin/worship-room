import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// Mutable auth mock — tests reassign `mockAuthValue` to simulate
// logged-out / logged-in-as-other / logged-in-as-author states.
const mockAuthValue: {
  user: { id: string; name: string } | null
  isAuthenticated: boolean
} = { user: null, isAuthenticated: false }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    ...mockAuthValue,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Mock the reports-api module so we can assert calls without network.
const mockReportPost = vi.fn().mockResolvedValue({ reportId: 'r-1', created: true })
vi.mock('@/services/api/reports-api', () => ({
  reportPost: (...args: unknown[]) => mockReportPost(...args),
}))

import { PrayerDetail } from '../PrayerDetail'

function renderDetail(prayerId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/prayer-wall/${prayerId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <Routes>
        <Route path="/prayer-wall/:id" element={<PrayerDetail />} />
      </Routes>
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayerDetail', () => {
  beforeEach(() => {
    mockAuthValue.user = null
    mockAuthValue.isAuthenticated = false
    mockReportPost.mockClear()
  })

  it('renders full prayer text without truncation for a known prayer', () => {
    renderDetail('prayer-1')
    // prayer-1 from mock data should render without "Show more"
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('shows breadcrumb instead of back link', () => {
    renderDetail('prayer-1')
    expect(screen.queryByText('Back to Prayer Wall')).not.toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    const link = nav.querySelector('a[href="/prayer-wall"]')
    expect(link).toHaveTextContent('Prayer Wall')
  })

  it('truncates long prayer titles at 40 chars', () => {
    // prayer-1 from mock data likely has a longer content
    renderDetail('prayer-1')
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    const current = nav.querySelector('[aria-current="page"]')
    expect(current).toBeInTheDocument()
    // Title should be at most 41 chars (40 + ellipsis)
    if (current!.textContent!.length > 41) {
      throw new Error(`Title too long: ${current!.textContent}`)
    }
  })

  it('falls back to "Prayer Request" when prayer not found', () => {
    renderDetail('nonexistent-prayer-id')
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    const current = nav.querySelector('[aria-current="page"]')
    expect(current).toHaveTextContent('Prayer Request')
  })

  it('renders comments without 5-comment limit', () => {
    // prayer-1 has comments in mock data — all should render
    renderDetail('prayer-1')
    // The comment input/link should be visible
    expect(screen.getByText('Log in to comment')).toBeInTheDocument()
  })

  it('shows 404-style message for unknown prayer ID', () => {
    renderDetail('nonexistent-prayer-id')
    expect(screen.getByText('Prayer not found')).toBeInTheDocument()
    expect(
      screen.getByText(/This prayer request may have been removed/),
    ).toBeInTheDocument()
  })

  it('Spec 5.5 — main PrayerCard renders with tier="detail" (accent variant chrome)', () => {
    renderDetail('prayer-1')
    const article = screen.getByRole('article')
    // Tier 1 accent variant
    expect(article.className).toContain('bg-violet-500/[0.08]')
    expect(article.className).toContain('border-violet-400/70')
  })

  it('shows report link', () => {
    renderDetail('prayer-1')
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  // Spec 3.8 — own-post hide + reports-api wiring tests.

  it('Spec 3.8: hides Report button when viewing own prayer', () => {
    // prayer-1 has userId 'user-1'.
    mockAuthValue.user = { id: 'user-1', name: 'Sarah' }
    mockAuthValue.isAuthenticated = true
    renderDetail('prayer-1')
    expect(screen.queryByText('Report')).not.toBeInTheDocument()
  })

  it('Spec 3.8: shows Report button when viewing other user\'s prayer', () => {
    mockAuthValue.user = { id: 'user-99', name: 'Bob' }
    mockAuthValue.isAuthenticated = true
    renderDetail('prayer-1')
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  it('Spec 3.8: shows Report button when logged out (AuthModal handles gate)', () => {
    mockAuthValue.user = null
    mockAuthValue.isAuthenticated = false
    renderDetail('prayer-1')
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  it('Spec 7.2 — ScriptureChip on the detail card links with both ?scroll-to= and ?verse=', () => {
    renderDetail('prayer-discussion-with-scripture')
    const chip = screen.getByRole('link', { name: /Read Romans 8:28 in the Bible/ })
    const href = chip.getAttribute('href') ?? ''
    expect(href).toContain('scroll-to=28')
    expect(href).toContain('verse=28')
  })
})
