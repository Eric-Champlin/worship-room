import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PrayerWallDashboard } from '../PrayerWallDashboard'

// Mock useAuth to return a logged-in user for dashboard testing
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: true,
    user: {
      id: 'user-1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah@example.com',
    },
  }),
}))

function renderDashboard() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall/dashboard']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
      </Routes>
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

  it('shows "Back to Prayer Wall" link', () => {
    renderDashboard()
    const backLink = screen.getByText('Back to Prayer Wall')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/prayer-wall')
  })

  it('shows edit buttons for name and bio', () => {
    renderDashboard()
    expect(screen.getByLabelText('Edit name')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit bio')).toBeInTheDocument()
  })
})
