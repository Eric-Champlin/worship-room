import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { FRIENDS_KEY } from '@/services/friends-storage'
import { LEADERBOARD_KEY } from '@/services/leaderboard-storage'
import type { FriendsData, FriendProfile } from '@/types/dashboard'
import { FriendsLeaderboard } from '../FriendsLeaderboard'
import { GlobalLeaderboard } from '../GlobalLeaderboard'
import { LeaderboardRow } from '../LeaderboardRow'
import { BoardSelector } from '../BoardSelector'

const AUTH_VALUE = {
  isAuthenticated: true,
  user: { name: 'Test User', id: 'test-user-id' },
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => AUTH_VALUE),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => AUTH_VALUE),
}))

function seedFriends(friends: FriendProfile[]) {
  const data: FriendsData = {
    friends,
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
  }
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
}

function renderFriendsLeaderboard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <FriendsLeaderboard />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function renderGlobalLeaderboard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <GlobalLeaderboard />
      </ToastProvider>
    </MemoryRouter>,
  )
}

const makeFriend = (overrides: Partial<FriendProfile>): FriendProfile => ({
  id: `friend-${Math.random().toString(36).slice(2)}`,
  displayName: 'Test F.',
  avatar: '',
  level: 1,
  levelName: 'Seedling',
  currentStreak: 0,
  faithPoints: 0,
  weeklyPoints: 0,
  lastActive: new Date().toISOString(),
  ...overrides,
})

describe('Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('FriendsLeaderboard edge cases', () => {
    it('all friends have 0 weekly points — ranked by total points', () => {
      seedFriends([
        makeFriend({ id: 'f1', displayName: 'Alice A.', weeklyPoints: 0, faithPoints: 500 }),
        makeFriend({ id: 'f2', displayName: 'Bob B.', weeklyPoints: 0, faithPoints: 200 }),
        makeFriend({ id: 'f3', displayName: 'Carol C.', weeklyPoints: 0, faithPoints: 800 }),
      ])
      renderFriendsLeaderboard()
      const list = screen.getByRole('list', { name: 'Friends leaderboard' })
      const items = within(list).getAllByRole('listitem')
      // Sorted by faithPoints: Carol (800), Alice (500), Bob (200), User (0)
      expect(items[0]).toHaveTextContent('Carol C.')
      expect(items[1]).toHaveTextContent('Alice A.')
      expect(items[2]).toHaveTextContent('Bob B.')
    })

    it('current user has 0 weekly points — still appears at bottom', () => {
      seedFriends([
        makeFriend({ id: 'f1', displayName: 'Alice A.', weeklyPoints: 50, faithPoints: 100 }),
      ])
      renderFriendsLeaderboard()
      const list = screen.getByRole('list', { name: 'Friends leaderboard' })
      const items = within(list).getAllByRole('listitem')
      // User (0 pts) should be last
      expect(items[items.length - 1]).toHaveTextContent('Test User (You)')
    })

    it('single friend + current user — rankings work', () => {
      seedFriends([
        makeFriend({ id: 'f1', displayName: 'Alice A.', weeklyPoints: 50 }),
      ])
      renderFriendsLeaderboard()
      const list = screen.getByRole('list', { name: 'Friends leaderboard' })
      const items = within(list).getAllByRole('listitem')
      expect(items).toHaveLength(2) // 1 friend + current user
    })
  })

  describe('LeaderboardRow edge cases', () => {
    it('very long display name is truncated (truncate class applied)', () => {
      const longNameFriend = makeFriend({
        displayName: 'Bartholomew Fitzwilliam-Henderson III.',
      })
      render(
        <ol>
          <LeaderboardRow
            rank={1}
            friend={longNameFriend}
            isCurrentUser={false}
            metric="weekly"
            index={0}
          />
        </ol>,
      )
      const nameEl = screen.getByText('Bartholomew Fitzwilliam-Henderson III.')
      expect(nameEl.className).toContain('truncate')
    })
  })

  describe('GlobalLeaderboard edge cases', () => {
    it('mock data corruption re-initializes', () => {
      localStorage.setItem(LEADERBOARD_KEY, '{"bad":true}')
      renderGlobalLeaderboard()
      const list = screen.getByRole('list', { name: 'Global leaderboard' })
      const items = within(list).getAllByRole('listitem')
      expect(items.length).toBeGreaterThan(0)
    })

    it('ties broken by total points, then alphabetically', () => {
      // Create data where top entries are tied on weekly + total
      const tiedData = [
        { id: 'g1', displayName: 'Charlie C.', weeklyPoints: 100, totalPoints: 500, level: 2, levelName: 'Sprout', badgeCount: 5 },
        { id: 'g2', displayName: 'Alice A.', weeklyPoints: 100, totalPoints: 500, level: 2, levelName: 'Sprout', badgeCount: 5 },
        { id: 'g3', displayName: 'Bob B.', weeklyPoints: 100, totalPoints: 500, level: 2, levelName: 'Sprout', badgeCount: 5 },
      ]
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(tiedData))
      renderGlobalLeaderboard()
      const list = screen.getByRole('list', { name: 'Global leaderboard' })
      const items = within(list).getAllByRole('listitem')
      // Should be alphabetical: Alice, Bob, Charlie (then Test User)
      expect(items[0]).toHaveTextContent('Alice A.')
      expect(items[1]).toHaveTextContent('Bob B.')
      expect(items[2]).toHaveTextContent('Charlie C.')
    })
  })

  describe('Accessibility', () => {
    it('BoardSelector uses accessible tablist pattern', () => {
      render(<BoardSelector activeBoard="friends" onBoardChange={() => {}} />)
      expect(screen.getByRole('tablist', { name: 'Leaderboard board selector' })).toBeInTheDocument()
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(2)
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    })

    it('staggered fade-in uses motion-safe guard', () => {
      const friend = makeFriend({ displayName: 'Test F.' })
      render(
        <ol>
          <LeaderboardRow rank={1} friend={friend} isCurrentUser={false} metric="weekly" index={0} />
        </ol>,
      )
      const li = screen.getByRole('listitem')
      expect(li.className).toContain('motion-safe:animate-fade-in')
    })
  })
})
