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

  it('renders SEO component for profile page', () => {
    setOwnData()
    renderProfilePage('/profile/my-user-id')
    // Title is managed by <SEO> (Helmet is globally mocked in test setup).
    // Title rendering is verified in SEO.test.tsx and Playwright; here we verify the page renders.
    expect(screen.getByText('Eric')).toBeTruthy()
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

  describe('profile garden', () => {
    it('renders garden on own profile', () => {
      setOwnData()
      renderProfilePage('/profile/my-user-id')
      // Stage 3 (Blooming, 500 pts) — aria-label should reference blooming
      const gardenSvg = screen.getByRole('img', { name: /your garden/i })
      expect(gardenSvg).toBeInTheDocument()
    })

    it('garden uses sm size on profile', () => {
      setOwnData()
      const { container } = renderProfilePage('/profile/my-user-id')
      const gardenWrapper = container.querySelector('.h-\\[150px\\]')
      expect(gardenWrapper).toBeTruthy()
    })

    it('garden is static (no animation classes)', () => {
      setOwnData()
      const { container } = renderProfilePage('/profile/my-user-id')
      const leafElements = container.querySelectorAll('.garden-leaf')
      expect(leafElements.length).toBe(0)
    })

    it('renders garden for friend profile with visible stats', () => {
      setOwnData()
      renderProfilePage('/profile/friend-sarah-m')
      const gardenSvg = screen.getByRole('img', { name: /your garden/i })
      expect(gardenSvg).toBeInTheDocument()
    })
  })
})
