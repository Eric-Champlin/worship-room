import { renderHook } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { CHALLENGE_NUDGE_KEY } from '@/constants/challenges'
import type { ChallengeProgress } from '@/types/challenges'

import { useChallengeNudge } from '../useChallengeNudge'

function makeProgress(overrides: Partial<ChallengeProgress> = {}): ChallengeProgress {
  return {
    joinedAt: '2026-03-01',
    currentDay: 3,
    completedDays: [1, 2],
    completedAt: null,
    streak: 2,
    missedDays: [],
    status: 'active',
    ...overrides,
  }
}

describe('useChallengeNudge', () => {
  const mockShowToast = vi.fn()
  const mockNavigate = vi.fn()
  const mockGetActiveChallenge = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Default: after 6 PM
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 23, 19, 0, 0)) // 7 PM
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: makeProgress(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderNudge(overrides = {}) {
    return renderHook(() =>
      useChallengeNudge({
        isAuthenticated: true,
        isDashboard: true,
        getActiveChallenge: mockGetActiveChallenge,
        showToast: mockShowToast,
        navigate: mockNavigate,
        ...overrides,
      }),
    )
  }

  it('shows nudge after 6 PM with incomplete day', () => {
    renderNudge()
    expect(mockShowToast).toHaveBeenCalledOnce()
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining("Don't forget your challenge!"),
      'warning',
      expect.objectContaining({ label: 'Go' }),
    )
  })

  it('does not show nudge before 6 PM', () => {
    vi.setSystemTime(new Date(2026, 2, 23, 14, 0, 0)) // 2 PM
    renderNudge()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not show nudge if day is complete', () => {
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: makeProgress({ currentDay: 3, completedDays: [1, 2, 3] }),
    })
    renderNudge()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not show nudge if already shown today', () => {
    localStorage.setItem(CHALLENGE_NUDGE_KEY, '2026-03-23')
    renderNudge()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not show nudge if nudges disabled in settings', () => {
    localStorage.setItem('wr_settings', JSON.stringify({
      notifications: { nudges: false },
    }))
    renderNudge()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not show nudge for unauthenticated users', () => {
    renderNudge({ isAuthenticated: false })
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not show nudge without active challenge', () => {
    mockGetActiveChallenge.mockReturnValue(undefined)
    renderNudge()
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('"Go" button navigates to challenge detail', () => {
    renderNudge()

    // Get the action from the showToast call
    const action = mockShowToast.mock.calls[0][2]
    action.onClick()

    expect(mockNavigate).toHaveBeenCalledWith('/challenges/pray40-lenten-journey')
  })

  it('writes today date to wr_challenge_nudge_shown', () => {
    renderNudge()
    expect(localStorage.getItem(CHALLENGE_NUDGE_KEY)).toBe('2026-03-23')
  })
})
