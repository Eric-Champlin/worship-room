import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWallProfile } from '../PrayerWallProfile'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

function renderProfile(userId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/prayer-wall/user/${userId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <Routes>
        <Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
      </Routes>
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayerWallProfile', () => {
  it('renders user name in profile header', () => {
    renderProfile('user-1')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Sarah')
  })

  it('shows 3 tabs: Prayers, Replies, Reactions', () => {
    renderProfile('user-1')
    expect(screen.getByRole('tab', { name: 'Prayers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Replies' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Reactions' })).toBeInTheDocument()
  })

  it('Prayers tab is selected by default', () => {
    renderProfile('user-1')
    expect(screen.getByRole('tab', { name: 'Prayers' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows breadcrumb instead of back link', () => {
    renderProfile('user-1')
    expect(screen.queryByText('Back to Prayer Wall')).not.toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    const current = nav.querySelector('[aria-current="page"]')
    expect(current).toHaveTextContent("Sarah's Profile")
  })

  it('falls back to "User Profile" when user not found', () => {
    renderProfile('nonexistent-user')
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    const current = nav.querySelector('[aria-current="page"]')
    expect(current).toHaveTextContent('User Profile')
  })

  it('shows user not found for invalid ID', () => {
    renderProfile('nonexistent-user')
    expect(screen.getByText('User not found')).toBeInTheDocument()
  })

  it('Spec 5.5 — bio paragraph renders without font-serif italic', () => {
    renderProfile('user-1')
    // Profile bio paragraph carries text-white/70 but no font-serif or italic
    const paragraphs = document.querySelectorAll('p.text-white\\/70')
    let foundBio = false
    paragraphs.forEach((p) => {
      const cls = p.className
      if (cls.includes('max-w-md')) {
        foundBio = true
        expect(cls).not.toContain('font-serif')
        expect(cls).not.toContain('italic')
      }
    })
    expect(foundBio).toBe(true)
  })

  it('can switch to Replies tab', async () => {
    const user = userEvent.setup()
    renderProfile('user-1')
    await user.click(screen.getByRole('tab', { name: 'Replies' }))
    expect(screen.getByRole('tab', { name: 'Replies' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('Spec 7.2 — ScriptureChip on a profile post links with both ?scroll-to= and ?verse=', () => {
    // Render PrayerWallProfile for user-3 (Emily, author of
    // prayer-discussion-with-scripture). The fixture's scriptureReference is
    // 'Romans 8:28' per frontend/src/mocks/prayer-wall-mock-data.ts.
    renderProfile('user-3')
    const chip = screen.getByRole('link', { name: /Read Romans 8:28 in the Bible/ })
    const href = chip.getAttribute('href') ?? ''
    expect(href).toContain('scroll-to=28')
    expect(href).toContain('verse=28')
  })
})
