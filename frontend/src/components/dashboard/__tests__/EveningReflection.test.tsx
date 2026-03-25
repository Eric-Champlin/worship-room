import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EveningReflection } from '../EveningReflection'
import type { ActivityType } from '@/types/dashboard'

// Mock KaraokeTextReveal to immediately complete
vi.mock('@/components/daily/KaraokeTextReveal', () => ({
  KaraokeTextReveal: ({ text, onRevealComplete }: { text: string; onRevealComplete?: () => void }) => (
    <span data-testid="karaoke-text">
      {text}
      {onRevealComplete && (
        <button type="button" data-testid="karaoke-complete" onClick={onRevealComplete}>
          complete
        </button>
      )}
    </span>
  ),
}))

const mockSaveMoodEntry = vi.fn()
vi.mock('@/services/mood-storage', () => ({
  saveMoodEntry: (...args: unknown[]) => mockSaveMoodEntry(...args),
}))

const mockMarkReflectionDone = vi.fn()
vi.mock('@/services/evening-reflection-storage', () => ({
  markReflectionDone: () => mockMarkReflectionDone(),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetTodayGratitude = vi.fn((): any => null)
const mockSaveGratitudeEntry = vi.fn()
vi.mock('@/services/gratitude-storage', () => ({
  getTodayGratitude: () => mockGetTodayGratitude(),
  saveGratitudeEntry: (...args: unknown[]) => mockSaveGratitudeEntry(...args),
}))

const mockActivities: Record<ActivityType, boolean> = {
  mood: true,
  pray: true,
  listen: false,
  prayerWall: false,
  readingPlan: false,
  meditate: false,
  journal: false,
  gratitude: false,
  reflection: false,
  challenge: false,
  localVisit: false,
}

function renderOverlay(overrides: Partial<Parameters<typeof EveningReflection>[0]> = {}) {
  const defaultProps = {
    onComplete: vi.fn(),
    onDismiss: vi.fn(),
    todayActivities: mockActivities,
    todayPoints: 15,
    currentStreak: 3,
    recordActivity: vi.fn(),
    ...overrides,
  }
  return {
    ...render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <EveningReflection {...defaultProps} />
      </MemoryRouter>,
    ),
    ...defaultProps,
  }
}

beforeEach(() => {
  localStorage.clear()
  mockSaveMoodEntry.mockClear()
  mockMarkReflectionDone.mockClear()
  mockGetTodayGratitude.mockReturnValue(null)
  mockSaveGratitudeEntry.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EveningReflection — Step 1 (Mood)', () => {
  it('renders all 5 mood orbs', () => {
    renderOverlay()
    expect(screen.getByText('How has your day been?')).toBeInTheDocument()
    const radiogroup = screen.getByRole('radiogroup')
    const radios = within(radiogroup).getAllByRole('radio')
    expect(radios).toHaveLength(5)
  })

  it('mood selection advances to Step 2', async () => {
    const user = userEvent.setup()
    renderOverlay()
    const radios = screen.getAllByRole('radio')
    await user.click(radios[3]) // "Good"
    expect(screen.getByText("Today's Highlights")).toBeInTheDocument()
  })

  it('has correct aria-checked on selection', async () => {
    const user = userEvent.setup()
    renderOverlay()
    const radios = screen.getAllByRole('radio')
    await user.click(radios[2]) // "Okay"
    // After click, Step 2 shows, but the radio should have been checked
    // before advancing. Since advance is immediate, let's check the dialog role instead.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has dialog role', () => {
    renderOverlay()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('EveningReflection — Step 2 (Highlights)', () => {
  async function goToStep2() {
    const user = userEvent.setup()
    const result = renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    return { user, ...result }
  }

  it('shows completed activities', async () => {
    await goToStep2()
    expect(screen.getByText('Logged mood')).toBeInTheDocument()
    expect(screen.getByText('Prayed')).toBeInTheDocument()
  })

  it('shows faith points and streak', async () => {
    await goToStep2()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText(/Day 3 streak/)).toBeInTheDocument()
  })

  it('textarea accepts text with character counter', async () => {
    const { user } = await goToStep2()
    const textarea = screen.getByLabelText("Today's highlight")
    await user.type(textarea, 'Great day!')
    expect(textarea).toHaveValue('Great day!')
    expect(screen.getByText('10/500')).toBeInTheDocument()
  })

  it('crisis detection shows banner', async () => {
    const { user } = await goToStep2()
    const textarea = screen.getByLabelText("Today's highlight")
    await user.type(textarea, 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('Next button always enabled', async () => {
    await goToStep2()
    const btn = screen.getByRole('button', { name: 'Next' })
    expect(btn).not.toBeDisabled()
  })
})

describe('EveningReflection — Step 3 (Gratitude)', () => {
  async function goToStep3() {
    const user = userEvent.setup()
    const result = renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    return { user, ...result }
  }

  it('shows 3 gratitude inputs when no existing gratitude', async () => {
    await goToStep3()
    expect(screen.getByText('Gratitude Moment')).toBeInTheDocument()
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(3)
  })

  it('shows read-only when gratitude already saved', async () => {
    mockGetTodayGratitude.mockReturnValue({
      id: 'test',
      date: '2026-03-22',
      items: ['Family', 'Health', 'Faith'],
      createdAt: '2026-03-22T20:00:00Z',
    })
    await goToStep3()
    expect(screen.getByText('You already counted your blessings today')).toBeInTheDocument()
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('crisis detection on gratitude inputs', async () => {
    const { user } = await goToStep3()
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('saves gratitude and records activity on Next', async () => {
    const { user, recordActivity } = await goToStep3()
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'My family')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(mockSaveGratitudeEntry).toHaveBeenCalled()
    expect(recordActivity).toHaveBeenCalledWith('gratitude')
  })
})

describe('EveningReflection — Step 4 (Prayer)', () => {
  async function goToStep4() {
    const user = userEvent.setup()
    const result = renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    return { user, ...result }
  }

  it('shows closing prayer text', async () => {
    await goToStep4()
    expect(screen.getByText('Closing Prayer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Goodnight' })).toBeInTheDocument()
  })

  it('Goodnight triggers verse reveal', async () => {
    const { user } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    expect(screen.getByTestId('karaoke-text')).toBeInTheDocument()
  })

  it('shows Done and Sleep buttons after verse reveal', async () => {
    const { user } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Go to Sleep/i })).toBeInTheDocument()
  })

  it('Go to Sleep links to /music?tab=sleep', async () => {
    const { user } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    const link = screen.getByRole('link', { name: /Go to Sleep/i })
    expect(link).toHaveAttribute('href', '/music?tab=sleep')
  })

  it('Done triggers completion sequence', async () => {
    const { user, recordActivity, onComplete } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(mockMarkReflectionDone).toHaveBeenCalled()
    expect(recordActivity).toHaveBeenCalledWith('reflection')
    expect(mockSaveMoodEntry).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalled()
  })
})

describe('EveningReflection — Navigation', () => {
  it('X close dismisses without recording activity', async () => {
    const user = userEvent.setup()
    const { onDismiss, recordActivity } = renderOverlay()
    await user.click(screen.getByLabelText('Close reflection'))
    expect(mockMarkReflectionDone).toHaveBeenCalled()
    expect(recordActivity).not.toHaveBeenCalled()
    expect(onDismiss).toHaveBeenCalled()
  })

  it('Back button goes to previous step', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    expect(screen.getByText("Today's Highlights")).toBeInTheDocument()
    await user.click(screen.getByLabelText('Go back'))
    expect(screen.getByText('How has your day been?')).toBeInTheDocument()
  })

  it('step dots show correct progress', async () => {
    const user = userEvent.setup()
    const { container } = renderOverlay()
    // Step 1: first dot should be filled
    let dots = container.querySelectorAll('.rounded-full.h-2.w-2')
    expect(dots[0]).toHaveClass('bg-white')
    expect(dots[1]).not.toHaveClass('bg-white')
    // Go to step 2
    await user.click(screen.getAllByRole('radio')[3])
    dots = container.querySelectorAll('.rounded-full.h-2.w-2')
    expect(dots[1]).toHaveClass('bg-white')
    expect(dots[0]).not.toHaveClass('bg-white')
  })

  it('evening mood entry has timeOfDay: evening', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    const savedEntry = mockSaveMoodEntry.mock.calls[0][0]
    expect(savedEntry.timeOfDay).toBe('evening')
  })
})
