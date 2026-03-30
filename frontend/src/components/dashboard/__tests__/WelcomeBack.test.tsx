import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelcomeBack } from '../WelcomeBack'

const mockPlaySoundEffect = vi.fn()
const mockShowToast = vi.fn()

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({
    showToast: mockShowToast,
    showCelebrationToast: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

// Mock challenges to control test data
const mockChallenges: { id: string; title: string; getStartDate: (year: number) => Date }[] = []
vi.mock('@/data/challenges', () => ({
  get CHALLENGES() { return mockChallenges },
}))

// Mock liturgical season
const mockGetLiturgicalSeason = vi.fn((_date?: Date) => ({
  currentSeason: { id: 'ordinary-time', name: 'Ordinary Time' },
}))
vi.mock('@/constants/liturgical-calendar', () => ({
  getLiturgicalSeason: (date: Date) => mockGetLiturgicalSeason(date),
}))

vi.mock('@/utils/date', () => ({
  getLocalDateString: () => '2026-03-30',
}))

const defaultFaithPoints = {
  currentStreak: 0,
  previousStreak: null as number | null,
  isFreeRepairAvailable: false,
  totalPoints: 0,
  repairStreak: vi.fn(),
}

const mockOnStepIn = vi.fn()
const mockOnSkipToDashboard = vi.fn()

function renderWelcomeBack(overrides: Partial<typeof defaultFaithPoints> = {}, userName = 'Eric') {
  const faithPoints = { ...defaultFaithPoints, ...overrides, repairStreak: overrides.repairStreak ?? defaultFaithPoints.repairStreak }
  return render(
    <WelcomeBack
      userName={userName}
      faithPoints={faithPoints}
      onStepIn={mockOnStepIn}
      onSkipToDashboard={mockOnSkipToDashboard}
    />
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  mockChallenges.length = 0
  mockGetLiturgicalSeason.mockReturnValue({
    currentSeason: { id: 'ordinary-time', name: 'Ordinary Time' },
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('WelcomeBack', () => {
  describe('Greeting', () => {
    it('renders greeting with user name', () => {
      renderWelcomeBack()
      expect(screen.getByText('Welcome back, Eric')).toBeInTheDocument()
    })

    it('renders greeting without name', () => {
      renderWelcomeBack({}, '')
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    })

    it('renders subheading', () => {
      renderWelcomeBack()
      expect(screen.getByText("We've been holding your spot.")).toBeInTheDocument()
    })
  })

  describe('Streak Section', () => {
    it('shows streak section when previousStreak > 1', () => {
      renderWelcomeBack({ previousStreak: 15 })
      expect(screen.getByText(/15-day/)).toBeInTheDocument()
      expect(screen.getByText(/streak going/)).toBeInTheDocument()
    })

    it('hides streak section when previousStreak is null', () => {
      renderWelcomeBack({ previousStreak: null })
      expect(screen.queryByText(/streak going/)).not.toBeInTheDocument()
    })

    it('hides streak section when previousStreak is 1', () => {
      renderWelcomeBack({ previousStreak: 1 })
      expect(screen.queryByText(/streak going/)).not.toBeInTheDocument()
    })

    it('shows grace line when streak section visible', () => {
      renderWelcomeBack({ previousStreak: 10 })
      expect(screen.getByText(/God's grace covers every gap/)).toBeInTheDocument()
    })
  })

  describe('Streak Repair Card', () => {
    it('shows free repair card when isFreeRepairAvailable', () => {
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: true })
      expect(screen.getByText('Use Free Repair')).toBeInTheDocument()
    })

    it('shows paid repair card when free used and 50+ points', () => {
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: false, totalPoints: 50 })
      expect(screen.getByText('Repair for 50 pts')).toBeInTheDocument()
    })

    it('hides repair card when no repair available', () => {
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: false, totalPoints: 10 })
      expect(screen.queryByText('Use Free Repair')).not.toBeInTheDocument()
      expect(screen.queryByText('Repair for 50 pts')).not.toBeInTheDocument()
    })

    it('repair button calls repairStreak and plays ascending', async () => {
      const mockRepair = vi.fn()
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: true, repairStreak: mockRepair })

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByText('Use Free Repair'))

      expect(mockRepair).toHaveBeenCalledWith(true)
      expect(mockPlaySoundEffect).toHaveBeenCalledWith('ascending')
    })

    it('repair shows toast with restored count', async () => {
      renderWelcomeBack({ previousStreak: 12, isFreeRepairAvailable: true })

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByText('Use Free Repair'))

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('12 days'),
        'success'
      )
    })

    it('auto-advances to check_in after repair', async () => {
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: true })

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByText('Use Free Repair'))

      expect(mockOnStepIn).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(mockOnStepIn).toHaveBeenCalledTimes(1)
    })

    it('hides CTAs after repair', async () => {
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: true })

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByText('Use Free Repair'))

      expect(screen.queryByText('Step Back In')).not.toBeInTheDocument()
      expect(screen.queryByText('Skip to Dashboard')).not.toBeInTheDocument()
    })

    it('shows aria-live announcement after repair', async () => {
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: true })

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByText('Use Free Repair'))

      expect(screen.getByRole('status')).toHaveTextContent(
        'Streak restored to 10 days. Continuing to mood check-in.'
      )
    })
  })

  describe('CTAs', () => {
    it('"Step Back In" calls onStepIn', async () => {
      renderWelcomeBack()

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByText('Step Back In'))

      expect(mockOnStepIn).toHaveBeenCalledTimes(1)
    })

    it('"Skip to Dashboard" calls onSkipToDashboard', async () => {
      renderWelcomeBack()

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByText('Skip to Dashboard'))

      expect(mockOnSkipToDashboard).toHaveBeenCalledTimes(1)
    })
  })

  describe("What's New", () => {
    it('shows items when friends data available', () => {
      localStorage.setItem('wr_streak', JSON.stringify({ lastActiveDate: '2026-03-25' }))
      localStorage.setItem('wr_friends', JSON.stringify({ friends: [{ id: '1' }, { id: '2' }] }))

      renderWelcomeBack()
      expect(screen.getByText('While you were away:')).toBeInTheDocument()
      expect(screen.getByText(/prayers shared on/)).toBeInTheDocument()
      expect(screen.getByText('the Prayer Wall')).toBeInTheDocument()
    })

    it('hidden when no items', () => {
      renderWelcomeBack()
      expect(screen.queryByText('While you were away:')).not.toBeInTheDocument()
    })

    it('shows challenge item when new challenge started since last active', () => {
      localStorage.setItem('wr_streak', JSON.stringify({ lastActiveDate: '2026-03-20' }))
      mockChallenges.push({
        id: 'lent-2026',
        title: 'Lent Journey',
        getStartDate: () => new Date('2026-03-25T00:00:00'),
      })

      renderWelcomeBack()
      expect(screen.getByText('While you were away:')).toBeInTheDocument()
      expect(screen.getByText('New challenge:')).toBeInTheDocument()
      expect(screen.getByText('Lent Journey')).toBeInTheDocument()
    })

    it('shows seasonal devotional item when liturgical season changed', () => {
      localStorage.setItem('wr_streak', JSON.stringify({ lastActiveDate: '2026-03-20' }))
      mockGetLiturgicalSeason.mockImplementation((_date?: Date) => {
        const d = _date ? _date.toISOString().split('T')[0] : ''
        if (d <= '2026-03-20') {
          return { currentSeason: { id: 'ordinary-time', name: 'Ordinary Time' } }
        }
        return { currentSeason: { id: 'lent', name: 'Lent' } }
      })

      renderWelcomeBack()
      expect(screen.getByText('While you were away:')).toBeInTheDocument()
      expect(screen.getByText('Lent devotionals are available')).toBeInTheDocument()
    })
  })

  describe('Accessibility & Sound', () => {
    it('heading receives focus on mount', () => {
      renderWelcomeBack()
      const heading = screen.getByText('Welcome back, Eric')
      expect(heading).toHaveFocus()
    })

    it('plays chime on mount', () => {
      renderWelcomeBack()
      expect(mockPlaySoundEffect).toHaveBeenCalledWith('chime')
    })

    it('animations disabled when prefers-reduced-motion', async () => {
      const { useReducedMotion } = await import('@/hooks/useReducedMotion')
      vi.mocked(useReducedMotion).mockReturnValue(true)

      renderWelcomeBack()
      const heading = screen.getByText('Welcome back, Eric')
      expect(heading.className).not.toContain('animate-fade-in')
    })

    it('all buttons have min 44px touch target', () => {
      renderWelcomeBack({ previousStreak: 10, isFreeRepairAvailable: true })

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.className).toContain('min-h-[44px]')
      })
    })
  })
})
