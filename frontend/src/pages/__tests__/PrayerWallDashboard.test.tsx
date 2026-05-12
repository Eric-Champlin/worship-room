import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWallDashboard } from '../PrayerWallDashboard'

// Mock useAuth to return a logged-in user for dashboard testing
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', name: 'Sarah Johnson' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

function renderDashboard() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall/dashboard']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <Routes>
        <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
      </Routes>
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayerWallDashboard', () => {
  it('renders 5 tabs', () => {
    renderDashboard()
    expect(screen.getByRole('tab', { name: 'My Prayers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'My Comments' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Bookmarks' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Reactions' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument()
  })

  it('Settings tab shows notification toggles with "coming soon" banner', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(screen.getByText('Notifications coming soon')).toBeInTheDocument()
    expect(screen.getByText('Someone prays for my prayer')).toBeInTheDocument()
    expect(screen.getByText('Someone comments on my prayer')).toBeInTheDocument()
  })

  it('"Change Photo" button shows "coming soon"', () => {
    renderDashboard()
    const photoBtn = screen.getByText('Change Photo (coming soon)')
    expect(photoBtn).toBeInTheDocument()
    expect(photoBtn).toBeDisabled()
  })

  it('shows breadcrumb instead of back link', () => {
    renderDashboard()
    expect(screen.queryByText('Back to Prayer Wall')).not.toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    const current = nav.querySelector('[aria-current="page"]')
    expect(current).toHaveTextContent('My Dashboard')
  })

  it('shows edit buttons for name and bio', () => {
    renderDashboard()
    expect(screen.getByLabelText('Edit name')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit bio')).toBeInTheDocument()
  })

  it('Spec 5.5 — display-name input uses canonical chrome when editing', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByLabelText('Edit name'))
    const input = screen.getByLabelText('Display name')
    expect(input.className).toContain('bg-white/[0.04]')
    expect(input.className).toContain('border-white/[0.12]')
    expect(input.className).toContain('focus:ring-violet-400/30')
  })

  it('Spec 5.5 — bio textarea uses canonical violet glow when editing', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByLabelText('Edit bio'))
    const textarea = screen.getByLabelText('Bio')
    expect(textarea.className).toContain('border-violet-400/30')
    expect(textarea.className).toContain('shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]')
    expect(textarea.className).toContain('focus:ring-violet-400/30')
  })

  it('Spec 5.5 — Settings notification card renders with FrostedCard chrome', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    // FrostedCard default-variant canonical chrome
    const heading = screen.getByText('Notification Preferences')
    const card = heading.closest('div')
    expect(card?.className).toContain('bg-white/[0.07]')
    expect(card?.className).toContain('border-white/[0.12]')
    expect(card?.className).toContain('rounded-3xl')
  })

  it('Spec 5.5 — tab focus ring is canonical ring-white/50', () => {
    renderDashboard()
    const tab = screen.getByRole('tab', { name: 'My Prayers' })
    expect(tab.className).toContain('focus-visible:ring-white/50')
  })
})
