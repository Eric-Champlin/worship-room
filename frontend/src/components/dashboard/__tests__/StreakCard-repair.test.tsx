import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StreakCard } from '../StreakCard'
import { ToastProvider } from '@/components/ui/Toast'

const BASE_PROPS = {
  currentStreak: 1,
  longestStreak: 10,
  totalPoints: 200,
  currentLevel: 2,
  levelName: 'Sprout',
  pointsToNextLevel: 300,
  todayMultiplier: 1,
}

beforeEach(() => {
  localStorage.clear()
})

function renderWithToast(overrides: Record<string, unknown> = {}) {
  const onRepairStreak = vi.fn()
  const result = render(
    <ToastProvider>
      <StreakCard {...BASE_PROPS} onRepairStreak={onRepairStreak} {...overrides} />
    </ToastProvider>,
  )
  return { ...result, onRepairStreak }
}

describe('StreakCard — repair UI visibility', () => {
  it('shows grace message when repair available', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: true })
    expect(screen.getByText('Everyone misses a day. Grace is built into your journey.')).toBeInTheDocument()
  })

  it('shows "Restore Streak" button when free repair available', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: true })
    expect(screen.getByRole('button', { name: 'Restore Streak' })).toBeInTheDocument()
  })

  it('shows "1 free repair per week" helper for free repair', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: true })
    expect(screen.getByText('1 free repair per week')).toBeInTheDocument()
  })

  it('shows "Repair with 50 points" when free used and points >= 50', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: false, totalPoints: 100 })
    expect(screen.getByRole('button', { name: 'Repair with 50 points' })).toBeInTheDocument()
  })

  it('shows "Free repair resets Monday" for paid repair', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: false, totalPoints: 100 })
    expect(screen.getByText('Free repair resets Monday')).toBeInTheDocument()
  })

  it('shows only message when no repair option (no free, < 50 pts)', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: false, totalPoints: 30 })
    // No buttons
    expect(screen.queryByRole('button', { name: 'Restore Streak' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Repair with 50 points' })).not.toBeInTheDocument()
    // But message shown
    expect(screen.getByText('Free repair resets Monday')).toBeInTheDocument()
    // Grace message still shown
    expect(screen.getByText('Everyone misses a day. Grace is built into your journey.')).toBeInTheDocument()
  })

  it('does NOT show repair UI for new users (longestStreak=0)', () => {
    renderWithToast({ currentStreak: 0, longestStreak: 0, previousStreak: null })
    expect(screen.queryByText('Everyone misses a day.')).not.toBeInTheDocument()
  })

  it('does NOT show repair UI when previousStreak is null', () => {
    renderWithToast({ currentStreak: 1, previousStreak: null })
    expect(screen.queryByText('Everyone misses a day.')).not.toBeInTheDocument()
    // Standard streak message should show
    expect(screen.getByText('Every day is a new beginning. Start fresh today.')).toBeInTheDocument()
  })

  it('does NOT show repair UI when currentStreak > 1 (active streak)', () => {
    renderWithToast({ currentStreak: 5, previousStreak: 3 })
    expect(screen.queryByText('Everyone misses a day.')).not.toBeInTheDocument()
  })

  it('does NOT show repair UI when longestStreak <= 1 (brand-new user)', () => {
    renderWithToast({ currentStreak: 1, longestStreak: 1, previousStreak: 2 })
    expect(screen.queryByText('Everyone misses a day.')).not.toBeInTheDocument()
  })
})

describe('StreakCard — repair interactions', () => {
  it('calls onRepairStreak(true) on free repair click', async () => {
    const { onRepairStreak } = renderWithToast({ previousStreak: 5, isFreeRepairAvailable: true })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Restore Streak' }))
    expect(onRepairStreak).toHaveBeenCalledWith(true)
  })

  it('calls onRepairStreak(false) on paid repair click', async () => {
    const { onRepairStreak } = renderWithToast({ previousStreak: 5, isFreeRepairAvailable: false, totalPoints: 100 })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Repair with 50 points' }))
    expect(onRepairStreak).toHaveBeenCalledWith(false)
  })

  it('buttons are keyboard accessible', async () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: true })
    const button = screen.getByRole('button', { name: 'Restore Streak' })

    // Focus the button
    button.focus()
    expect(button).toHaveFocus()
  })

  it('buttons have min 44px touch target', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: true })
    const button = screen.getByRole('button', { name: 'Restore Streak' })
    expect(button.className).toContain('min-h-[44px]')
  })

  it('paid repair button has min 44px touch target', () => {
    renderWithToast({ previousStreak: 5, isFreeRepairAvailable: false, totalPoints: 100 })
    const button = screen.getByRole('button', { name: 'Repair with 50 points' })
    expect(button.className).toContain('min-h-[44px]')
  })
})

describe('StreakCard — repair animation', () => {
  it('repair UI disappears after repair (previousStreak becomes null)', async () => {
    const onRepairStreak = vi.fn()
    const { rerender } = render(
      <ToastProvider>
        <StreakCard
          {...BASE_PROPS}
          currentStreak={1}
          previousStreak={10}
          isFreeRepairAvailable={true}
          onRepairStreak={onRepairStreak}
        />
      </ToastProvider>,
    )

    // Repair UI visible
    expect(screen.getByText('Everyone misses a day. Grace is built into your journey.')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Restore Streak' }))

    // Simulate parent re-render with restored values
    rerender(
      <ToastProvider>
        <StreakCard
          {...BASE_PROPS}
          currentStreak={10}
          previousStreak={null}
          isFreeRepairAvailable={false}
          onRepairStreak={onRepairStreak}
        />
      </ToastProvider>,
    )

    // Repair UI gone
    expect(screen.queryByText('Everyone misses a day. Grace is built into your journey.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restore Streak' })).not.toBeInTheDocument()
    // Streak value displayed (may be in AnimatedCounter span)
    expect(screen.getByText('days streak')).toBeInTheDocument()
  })
})
