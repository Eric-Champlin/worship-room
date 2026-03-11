import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoutineStepper } from '../RoutineStepper'
import type { AudioState, AudioRoutine } from '@/types/audio'

// ── Mocks ────────────────────────────────────────────────────────────

const mockDispatch = vi.fn()

let mockActiveRoutine: AudioRoutine | null = null

vi.mock('../AudioProvider', () => ({
  useAudioState: (): Partial<AudioState> => ({
    activeRoutine: mockActiveRoutine,
  }),
  useAudioDispatch: () => mockDispatch,
}))

const THREE_STEP_ROUTINE: AudioRoutine = {
  routineId: 'r1',
  routineName: 'Test Routine',
  currentStepIndex: 0,
  phase: 'playing',
  sleepTimerConfig: { durationMinutes: 30, fadeDurationMinutes: 10 },
  steps: [
    { stepId: 's1', type: 'scene', contentId: 'still-waters', label: 'Still Waters', icon: 'Mountain', transitionGapMinutes: 0 },
    { stepId: 's2', type: 'scripture', contentId: 'psalm-23', label: 'Psalm 23', icon: 'BookOpen', transitionGapMinutes: 2 },
    { stepId: 's3', type: 'story', contentId: 'elijah', label: 'Elijah', icon: 'Moon', transitionGapMinutes: 5 },
  ],
}

describe('RoutineStepper', () => {
  beforeEach(() => {
    mockActiveRoutine = null
    vi.clearAllMocks()
  })

  it('renders nothing when no routine active', () => {
    const { container } = render(<RoutineStepper />)
    expect(container.innerHTML).toBe('')
  })

  it('renders step icons for each step type', () => {
    mockActiveRoutine = THREE_STEP_ROUTINE
    render(<RoutineStepper />)

    // All 3 steps + timer = 4 circles; verify by aria-labels
    expect(screen.getByLabelText(/Step 1: Still Waters \(current\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Step 2: Psalm 23/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Step 3: Elijah/)).toBeInTheDocument()
  })

  it('current step has scale-110 class', () => {
    mockActiveRoutine = THREE_STEP_ROUTINE
    render(<RoutineStepper />)

    const currentStep = screen.getByLabelText(/Step 1.*current/)
    expect(currentStep.className).toContain('scale-110')
  })

  it('completed steps show check icon', () => {
    mockActiveRoutine = { ...THREE_STEP_ROUTINE, currentStepIndex: 2 }
    render(<RoutineStepper />)

    const completedStep = screen.getByLabelText(/Step 1.*completed/)
    expect(completedStep).toBeInTheDocument()
  })

  it('timer icon appears at end', () => {
    mockActiveRoutine = THREE_STEP_ROUTINE
    render(<RoutineStepper />)

    // The timer label is visible on sm+ screens
    expect(screen.getByText('Timer')).toBeInTheDocument()
  })

  it('skip button has correct aria-label', () => {
    mockActiveRoutine = THREE_STEP_ROUTINE
    render(<RoutineStepper />)

    expect(
      screen.getByRole('button', { name: 'Skip to next routine step' }),
    ).toBeInTheDocument()
  })

  it('progressbar ARIA attributes are correct', () => {
    mockActiveRoutine = THREE_STEP_ROUTINE
    render(<RoutineStepper />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuemin', '1')
    expect(progressbar).toHaveAttribute('aria-valuemax', '3')
    expect(progressbar).toHaveAttribute('aria-valuenow', '1')
    expect(progressbar).toHaveAttribute(
      'aria-label',
      'Routine progress — step 1 of 3',
    )
  })
})
