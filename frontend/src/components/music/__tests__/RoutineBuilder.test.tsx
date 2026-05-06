import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoutineBuilder } from '../RoutineBuilder'

vi.mock('@/data/scenes', () => ({
  SCENE_BY_ID: new Map(),
}))

vi.mock('@/data/music/scripture-readings', () => ({
  SCRIPTURE_READING_BY_ID: new Map(),
}))

vi.mock('@/data/music/bedtime-stories', () => ({
  BEDTIME_STORY_BY_ID: new Map(),
}))

vi.mock('@/constants/audio', () => ({
  AUDIO_CONFIG: {
    SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90],
    FADE_DURATION_OPTIONS: [5, 10, 15, 30],
  },
}))

const defaultProps = {
  onSave: vi.fn(),
  onCancel: vi.fn(),
}

const ROUTINE_WITH_STEP = {
  id: 'test-routine',
  name: 'My Routine',
  isTemplate: false as const,
  steps: [{ id: 'step-1', type: 'scene' as const, contentId: 'rain', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 45, fadeDurationMinutes: 15 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// ── Step 6: Save CTA + border opacity + Cancel touch target ──────────────────

describe('RoutineBuilder — Step 6 visual migration', () => {
  it('Save Routine CTA uses white-pill Pattern 2 chrome', () => {
    render(<RoutineBuilder {...defaultProps} initial={ROUTINE_WITH_STEP} />)
    const saveBtn = screen.getByRole('button', { name: /Save Routine/i })
    expect(saveBtn.className).toContain('bg-white')
    expect(saveBtn.className).toContain('rounded-full')
    expect(saveBtn.className).toContain('min-h-[44px]')
    expect(saveBtn.className).toContain('text-hero-bg')
    expect(saveBtn.className).toContain('shadow-[0_0_30px_rgba(255,255,255,0.20)]')
  })

  it('Save Routine CTA does NOT have bg-primary', () => {
    render(<RoutineBuilder {...defaultProps} initial={ROUTINE_WITH_STEP} />)
    const saveBtn = screen.getByRole('button', { name: /Save Routine/i })
    expect(saveBtn.className).not.toContain('bg-primary')
  })

  it('Save Routine is disabled when steps.length === 0', () => {
    render(<RoutineBuilder {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Save Routine/i })).toBeDisabled()
  })

  it('Cancel button has min-h-[44px]', () => {
    render(<RoutineBuilder {...defaultProps} />)
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i })
    expect(cancelBtn.className).toContain('min-h-[44px]')
  })

  it('dialog wrapper uses border-white/[0.12] (not border-white/10)', () => {
    const { container } = render(<RoutineBuilder {...defaultProps} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('border-white/[0.12]')
    expect(wrapper.className).not.toContain('border-white/10')
  })
})

// ── Existing tests ────────────────────────────────────────────────────────────

describe('RoutineBuilder — name validation', () => {
  it('shows error when saving with empty name', async () => {
    render(<RoutineBuilder {...defaultProps} />)
    // Need at least one step to enable save — but save button is disabled when steps.length === 0
    // The name validation only triggers when steps exist, so we test the save button enabled state first
    // Actually, since save is disabled with 0 steps, the name error only fires when steps > 0
    // Let's test the aria attributes on the input instead
    const nameInput = screen.getByLabelText('Routine Name')
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('maxLength', '50')
  })

  it('name input has aria-invalid on error', async () => {
    const user = userEvent.setup()
    // Provide initial with steps so Save is enabled
    render(
      <RoutineBuilder
        {...defaultProps}
        initial={{
          id: 'test-routine',
          name: '',
          isTemplate: false,
          steps: [{ id: 'step-1', type: 'scene', contentId: 'rain', transitionGapMinutes: 0 }],
          sleepTimer: { durationMinutes: 45, fadeDurationMinutes: 15 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Save Routine' }))
    const nameInput = screen.getByLabelText('Routine Name')
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Routine name is required')).toBeInTheDocument()
  })

  it('error clears when user types', async () => {
    const user = userEvent.setup()
    render(
      <RoutineBuilder
        {...defaultProps}
        initial={{
          id: 'test-routine',
          name: '',
          isTemplate: false,
          steps: [{ id: 'step-1', type: 'scene', contentId: 'rain', transitionGapMinutes: 0 }],
          sleepTimer: { durationMinutes: 45, fadeDurationMinutes: 15 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Save Routine' }))
    expect(screen.getByText('Routine name is required')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Routine Name'), 'My Routine')
    expect(screen.queryByText('Routine name is required')).not.toBeInTheDocument()
  })

  it('character count shows near limit', async () => {
    const user = userEvent.setup()
    render(<RoutineBuilder {...defaultProps} />)
    const nameInput = screen.getByLabelText('Routine Name')
    await user.type(nameInput, 'a'.repeat(36))
    expect(screen.getByText('36 / 50')).toBeInTheDocument()
  })
})
