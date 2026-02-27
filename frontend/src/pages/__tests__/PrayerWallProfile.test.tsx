import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PrayerWallProfile } from '../PrayerWallProfile'

function renderProfile(userId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/prayer-wall/user/${userId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
      </Routes>
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

  it('shows "Back to Prayer Wall" link', () => {
    renderProfile('user-1')
    const backLink = screen.getByText('Back to Prayer Wall')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/prayer-wall')
  })

  it('shows user not found for invalid ID', () => {
    renderProfile('nonexistent-user')
    expect(screen.getByText('User not found')).toBeInTheDocument()
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
})
