import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { renderHook } from '@testing-library/react'

// Mock useSoundEffects
const mockPlaySoundEffect = vi.fn()
vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

import { MoodCheckIn } from '../MoodCheckIn'
import { StreakCard } from '../StreakCard'
import { GettingStartedCard } from '../GettingStartedCard'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import type { GettingStartedItem } from '@/hooks/useGettingStarted'

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    MemoryRouter,
    { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    createElement(ToastProvider, null, children),
  )
}

function makeItems(overrides: Partial<Record<string, boolean>> = {}): GettingStartedItem[] {
  const defs = [
    { key: 'mood_done', activityType: 'mood', label: 'Check in with your mood', pointHint: '+5 pts', destination: null },
    { key: 'pray_done', activityType: 'pray', label: 'Generate your first prayer', pointHint: '+10 pts', destination: '/daily?tab=pray' },
    { key: 'journal_done', activityType: 'journal', label: 'Write a journal entry', pointHint: '+25 pts', destination: '/daily?tab=journal' },
    { key: 'meditate_done', activityType: 'meditate', label: 'Try a meditation', pointHint: '+20 pts', destination: '/daily?tab=meditate' },
    { key: 'ambient_visited', activityType: null, label: 'Listen to ambient sounds', pointHint: '+10 pts', destination: '/music?tab=ambient' },
    { key: 'prayer_wall_visited', activityType: null, label: 'Explore the Prayer Wall', pointHint: '+15 pts', destination: '/prayer-wall' },
  ]
  return defs.map((d) => ({
    ...d,
    completed: overrides[d.key] ?? false,
  })) as GettingStartedItem[]
}

function simulateLogin() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'TestUser')
  localStorage.setItem('wr_user_id', 'test-id-123')
}

describe('Sound Triggers — Dashboard & Gamification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('MoodCheckIn', () => {
    it('plays chime on verse display', async () => {
      const user = userEvent.setup()
      render(
        <MoodCheckIn userName="Eric" onComplete={vi.fn()} onSkip={vi.fn()} />,
        { wrapper },
      )

      await user.click(screen.getByText('Good'))
      await user.click(screen.getByText('Continue'))

      expect(mockPlaySoundEffect).toHaveBeenCalledWith('chime')
    })
  })

  describe('StreakCard', () => {
    it('plays ascending on streak milestone', () => {
      render(
        <StreakCard
          currentStreak={7}
          longestStreak={7}
          totalPoints={100}
          currentLevel={1}
          levelName="Seedling"
          pointsToNextLevel={0}
          todayMultiplier={1}
        />,
        { wrapper },
      )

      expect(mockPlaySoundEffect).toHaveBeenCalledWith('ascending')
    })

    it('does not re-play on same milestone re-render', () => {
      const props = {
        currentStreak: 7,
        longestStreak: 7,
        totalPoints: 100,
        currentLevel: 1,
        levelName: 'Seedling',
        pointsToNextLevel: 0,
        todayMultiplier: 1,
      }

      const { rerender } = render(<StreakCard {...props} />, { wrapper })

      const count = mockPlaySoundEffect.mock.calls.filter(
        (c: unknown[]) => c[0] === 'ascending',
      ).length
      expect(count).toBe(1)

      // rerender keeps the same wrapper, just pass the component directly
      rerender(<StreakCard {...props} />)

      const countAfter = mockPlaySoundEffect.mock.calls.filter(
        (c: unknown[]) => c[0] === 'ascending',
      ).length
      expect(countAfter).toBe(1)
    })

    it('plays whisper on streak repair', async () => {
      const user = userEvent.setup()
      const mockRepair = vi.fn()
      render(
        <StreakCard
          currentStreak={1}
          longestStreak={14}
          totalPoints={100}
          currentLevel={1}
          levelName="Seedling"
          pointsToNextLevel={0}
          todayMultiplier={1}
          previousStreak={14}
          isFreeRepairAvailable={true}
          onRepairStreak={mockRepair}
        />,
        { wrapper },
      )

      const repairButton = screen.getByText(/Restore Streak/i)
      await user.click(repairButton)

      expect(mockPlaySoundEffect).toHaveBeenCalledWith('whisper')
    })
  })

  describe('useFaithPoints events', () => {
    function faithPointsWrapper({ children }: { children: ReactNode }) {
      return createElement(AuthProvider, null, children)
    }

    it('dispatches wr:points-earned event on recordActivity', () => {
      simulateLogin()

      const events: string[] = []
      const handler = () => events.push('points-earned')
      window.addEventListener('wr:points-earned', handler)

      const { result } = renderHook(() => useFaithPoints(), { wrapper: faithPointsWrapper })

      act(() => {
        result.current.recordActivity('mood', 'test')
      })

      window.removeEventListener('wr:points-earned', handler)
      expect(events).toContain('points-earned')
    })

    it('dispatches wr:level-up on level change', () => {
      simulateLogin()
      // Set points just below level 2 threshold (100)
      localStorage.setItem(
        'wr_faith_points',
        JSON.stringify({
          totalPoints: 96,
          currentLevel: 1,
          currentLevelName: 'Seedling',
          pointsToNextLevel: 4,
          lastUpdated: new Date().toISOString(),
        }),
      )

      const events: string[] = []
      const handler = () => events.push('level-up')
      window.addEventListener('wr:level-up', handler)

      const { result } = renderHook(() => useFaithPoints(), { wrapper: faithPointsWrapper })

      // mood gives 5 points → 96 + 5 = 101 → level 2
      act(() => {
        result.current.recordActivity('mood', 'test')
      })

      window.removeEventListener('wr:level-up', handler)
      expect(events).toContain('level-up')
    })
  })

  describe('GettingStartedCard', () => {
    it('plays sparkle on item completion', () => {
      const items = makeItems()

      const { rerender } = render(
        <GettingStartedCard
          items={items}
          completedCount={0}
          onDismiss={vi.fn()}
          onRequestCheckIn={vi.fn()}
        />,
        { wrapper },
      )

      // Re-render with one item completed — rerender reuses the wrapper
      const updatedItems = makeItems({ mood_done: true })

      rerender(
        <GettingStartedCard
          items={updatedItems}
          completedCount={1}
          onDismiss={vi.fn()}
          onRequestCheckIn={vi.fn()}
        />,
      )

      expect(mockPlaySoundEffect).toHaveBeenCalledWith('sparkle')
    })
  })
})
