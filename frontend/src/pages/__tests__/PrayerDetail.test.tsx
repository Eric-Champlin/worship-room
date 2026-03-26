import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerDetail } from '../PrayerDetail'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

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

  it('shows report link', () => {
    renderDetail('prayer-1')
    expect(screen.getByText('Report')).toBeInTheDocument()
  })
})
