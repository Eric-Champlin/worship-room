import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'

// Mock useSoundEffects
const mockPlaySoundEffect = vi.fn()
vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Eric' } }),
}))

// Mock useFaithPoints
vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    recordActivity: vi.fn(),
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {},
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    newlyEarnedBadges: [],
    clearNewlyEarnedBadges: vi.fn(),
    repairStreak: vi.fn(),
    previousStreak: null,
    isFreeRepairAvailable: false,
  }),
}))

// Mock useReadingPlanProgress
vi.mock('@/hooks/useReadingPlanProgress', () => ({
  useReadingPlanProgress: () => ({
    getPlanStatus: () => 'completed',
  }),
}))

import { GratitudeWidget } from '@/components/dashboard/GratitudeWidget'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'

// Mock AuthModalProvider for InteractionBar
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ showAuthModal: vi.fn() }),
}))

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    MemoryRouter,
    { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    createElement(ToastProvider, null, children),
  )
}

describe('Sound Triggers — Content Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('GratitudeWidget', () => {
    it('plays chime on save', async () => {
      const user = userEvent.setup()
      render(<GratitudeWidget onGratitudeSaved={vi.fn()} />, { wrapper })

      // Fill in at least one gratitude input
      const inputs = screen.getAllByRole('textbox')
      await user.type(inputs[0], 'Grateful for today')

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      expect(mockPlaySoundEffect).toHaveBeenCalledWith('chime')
    })
  })

  describe('InteractionBar', () => {
    const basePrayer = {
      id: '1',
      userId: '1',
      authorName: 'User',
      authorAvatarUrl: null,
      isAnonymous: false,
      content: 'Test prayer',
      category: 'praise' as const,
      postType: 'prayer_request',
      isAnswered: false,
      answeredText: null,
      answeredAt: null,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      prayingCount: 0,
      commentCount: 0,
    }

    it('plays whisper on pray ceremony', async () => {
      const user = userEvent.setup()
      const togglePraying = vi.fn()
      render(
        <InteractionBar
          prayer={basePrayer}
          reactions={undefined}
          onTogglePraying={togglePraying}
          onToggleComments={vi.fn()}
          onToggleBookmark={vi.fn()}
          isCommentsOpen={false}
        />,
        { wrapper },
      )

      const prayButton = screen.getByLabelText(/pray for this request/i)
      await user.click(prayButton)

      expect(mockPlaySoundEffect).toHaveBeenCalledWith('whisper')
    })

    it('does not play on untoggle', async () => {
      const user = userEvent.setup()
      const togglePraying = vi.fn()
      render(
        <InteractionBar
          prayer={basePrayer}
          reactions={{ prayerId: '1', isPraying: true, isBookmarked: false }}
          onTogglePraying={togglePraying}
          onToggleComments={vi.fn()}
          onToggleBookmark={vi.fn()}
          isCommentsOpen={false}
        />,
        { wrapper },
      )

      const prayButton = screen.getByLabelText(/stop praying for this request/i)
      await user.click(prayButton)

      expect(mockPlaySoundEffect).not.toHaveBeenCalledWith('whisper')
    })
  })
})
