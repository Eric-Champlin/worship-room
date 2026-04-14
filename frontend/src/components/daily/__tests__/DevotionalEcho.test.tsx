import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DevotionalTabContent } from '../DevotionalTabContent'
import type { Echo } from '@/types/echoes'

let mockEchoValue: Echo | null = null

vi.mock('@/hooks/useEcho', () => ({
  useEcho: () => mockEchoValue,
  markEchoSeen: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/useReadAloud', () => ({
  useReadAloud: () => ({
    state: 'idle',
    currentWordIndex: -1,
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
})

function renderDevotional() {
  return render(
    <MemoryRouter
      initialEntries={['/daily?tab=devotional']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <DevotionalTabContent
            onSwitchToJournal={vi.fn()}
            onSwitchToPray={vi.fn()}
            onComplete={vi.fn()}
          />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DevotionalTabContent EchoCard integration', () => {
  it('renders EchoCard in devotional tab when echo exists', () => {
    mockEchoValue = {
      id: 'echo:memorized:psalms:23:1-1',
      kind: 'memorized',
      book: 'psalms',
      bookName: 'Psalms',
      chapter: 23,
      startVerse: 1,
      endVerse: 1,
      text: 'The LORD is my shepherd',
      reference: 'Psalms 23:1',
      relativeLabel: 'a month ago',
      occurredAt: Date.now() - 30 * 86_400_000,
      score: 130,
    }
    renderDevotional()
    expect(screen.getByText('You memorized this a month ago')).toBeInTheDocument()
    expect(screen.getByText('The LORD is my shepherd')).toBeInTheDocument()
  })

  it('renders nothing when echo is null', () => {
    mockEchoValue = null
    renderDevotional()
    expect(screen.queryByText(/You memorized this/)).not.toBeInTheDocument()
    expect(screen.queryByText(/You highlighted this/)).not.toBeInTheDocument()
  })
})
