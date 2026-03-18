import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FriendProfile } from '@/types/dashboard'
import { LeaderboardRow } from '../LeaderboardRow'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Eric', id: 'user-1' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showCelebrationToast: vi.fn(),
  }),
}))

const FRIEND: FriendProfile = {
  id: 'friend-sarah-m',
  displayName: 'Sarah M.',
  avatar: '',
  level: 4,
  levelName: 'Flourishing',
  currentStreak: 45,
  faithPoints: 3200,
  weeklyPoints: 145,
  lastActive: new Date().toISOString(),
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderRow(overrides: Partial<Parameters<typeof LeaderboardRow>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ol>
        <LeaderboardRow
          rank={1}
          friend={FRIEND}
          isCurrentUser={false}
          metric="weekly"
          index={0}
          {...overrides}
        />
      </ol>
    </MemoryRouter>,
  )
}

describe('LeaderboardRow Encourage Button', () => {
  it('renders Encourage button when showEncourage=true', () => {
    renderRow({ showEncourage: true })
    const buttons = screen.getAllByRole('button')
    const encourageButton = buttons.find(
      (btn) => btn.getAttribute('aria-label')?.toLowerCase().includes('encourage'),
    )
    expect(encourageButton).toBeTruthy()
  })

  it('does NOT render Encourage for current user', () => {
    renderRow({ showEncourage: true, isCurrentUser: true })
    const buttons = screen.queryAllByRole('button')
    const encourageButton = buttons.find(
      (btn) => btn.getAttribute('aria-label')?.toLowerCase().includes('encourage'),
    )
    expect(encourageButton).toBeUndefined()
  })

  it('does NOT render Encourage when showEncourage=false', () => {
    renderRow({ showEncourage: false })
    const buttons = screen.queryAllByRole('button')
    const encourageButton = buttons.find(
      (btn) => btn.getAttribute('aria-label')?.toLowerCase().includes('encourage'),
    )
    expect(encourageButton).toBeUndefined()
  })

  it('does NOT render Encourage when showEncourage not provided', () => {
    renderRow()
    const buttons = screen.queryAllByRole('button')
    const encourageButton = buttons.find(
      (btn) => btn.getAttribute('aria-label')?.toLowerCase().includes('encourage'),
    )
    expect(encourageButton).toBeUndefined()
  })

  it('Encourage button has opacity-0 class for hover reveal on desktop', () => {
    renderRow({ showEncourage: true })
    const buttons = screen.getAllByRole('button')
    const encourageButton = buttons.find(
      (btn) => btn.getAttribute('aria-label')?.toLowerCase().includes('encourage'),
    )
    // The parent div should have the hover-reveal classes
    const wrapper = encourageButton?.closest('div[class*="sm:opacity-0"]')
    expect(wrapper).toBeTruthy()
  })

  it('row has group class for hover reveal', () => {
    renderRow({ showEncourage: true })
    const li = screen.getByRole('listitem')
    expect(li.className).toContain('group')
  })
})
