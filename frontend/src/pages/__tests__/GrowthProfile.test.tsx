import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GrowthProfile } from '../GrowthProfile'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'

function renderProfilePage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <Routes>
              <Route path="/profile/:userId" element={<GrowthProfile />} />
            </Routes>
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function setAuth() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  localStorage.setItem('wr_user_id', 'my-user-id')
}

function setOwnData() {
  setAuth()
  localStorage.setItem('wr_settings', JSON.stringify({
    profile: { displayName: 'Eric', avatarId: 'faith-cross', bio: '', email: '' },
    notifications: {},
    privacy: { streakVisibility: 'friends', showOnGlobalLeaderboard: true, activityStatus: true, nudgePermission: 'friends', blockedUsers: [] },
  }))
  localStorage.setItem('wr_faith_points', JSON.stringify({
    totalPoints: 500, currentLevel: 3, currentLevelName: 'Blooming', pointsToNextLevel: 1000, lastUpdated: '2026-01-01',
  }))
  localStorage.setItem('wr_streak', JSON.stringify({
    currentStreak: 14, longestStreak: 30, lastActiveDate: '2026-03-18',
  }))
  localStorage.setItem('wr_badges', JSON.stringify({
    earned: { welcome: { earnedAt: '2026-01-01' }, level_1: { earnedAt: '2026-01-01' } },
    newlyEarned: [],
    activityCounts: { ...FRESH_ACTIVITY_COUNTS },
  }))
  localStorage.setItem('wr_mood_entries', JSON.stringify([]))
  localStorage.setItem('wr_friends', JSON.stringify({
    friends: [
      { id: 'friend-sarah-m', displayName: 'Sarah M.', avatar: '', level: 4, levelName: 'Flourishing', currentStreak: 45, faithPoints: 3200, weeklyPoints: 145, lastActive: new Date().toISOString() },
    ],
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
  }))
}

describe('GrowthProfile', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders own profile', () => {
    setOwnData()
    renderProfilePage('/profile/my-user-id')
    expect(screen.getByText('Eric')).toBeTruthy()
    expect(screen.getByText('Edit Profile')).toBeTruthy()
  })

  it('renders friend profile', () => {
    setOwnData()
    renderProfilePage('/profile/friend-sarah-m')
    expect(screen.getByText('Sarah M.')).toBeTruthy()
    expect(screen.getByText('Send Encouragement')).toBeTruthy()
  })

  it('shows "Profile not found" for invalid userId', () => {
    setOwnData()
    renderProfilePage('/profile/nonexistent')
    expect(screen.getByText('Profile not found')).toBeTruthy()
    expect(screen.getByText('Go to Friends')).toBeTruthy()
    expect(screen.getByText('Go Home')).toBeTruthy()
  })

  it('sets document title correctly', () => {
    setOwnData()
    renderProfilePage('/profile/my-user-id')
    expect(document.title).toBe("Eric's Profile")
  })

  it('has correct background gradient classes', () => {
    setOwnData()
    const { container } = renderProfilePage('/profile/my-user-id')
    const bgDiv = container.querySelector('.bg-gradient-to-b')
    expect(bgDiv).toBeTruthy()
  })

  it('page has fade-in animation class', () => {
    setOwnData()
    const { container } = renderProfilePage('/profile/my-user-id')
    const animated = container.querySelector('.motion-safe\\:animate-fade-in')
    expect(animated).toBeTruthy()
  })
})
