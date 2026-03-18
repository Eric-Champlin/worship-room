import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LeaderboardEntry } from '@/types/dashboard'
import { ProfilePopup } from '../ProfilePopup'

const mockEntry: LeaderboardEntry = {
  id: 'gl-01',
  displayName: 'Alex T.',
  weeklyPoints: 170,
  totalPoints: 5200,
  level: 5,
  levelName: 'Oak',
  badgeCount: 18,
}

describe('ProfilePopup', () => {
  it('shows level icon + name + badge count', () => {
    render(<ProfilePopup entry={mockEntry} onClose={() => {}} />)
    expect(screen.getByText('Oak')).toBeInTheDocument()
    expect(screen.getByText('18 badges')).toBeInTheDocument()
  })

  it('has role="dialog" and aria-label', () => {
    render(<ProfilePopup entry={mockEntry} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Profile of Alex T.')
  })

  it('calls onClose on Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ProfilePopup entry={mockEntry} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on outside click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <div>
        <div data-testid="outside">outside</div>
        <ProfilePopup entry={mockEntry} onClose={onClose} />
      </div>,
    )
    await user.click(container.querySelector('[data-testid="outside"]')!)
    expect(onClose).toHaveBeenCalled()
  })
})
