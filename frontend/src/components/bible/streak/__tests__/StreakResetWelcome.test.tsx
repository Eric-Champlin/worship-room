import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StreakResetWelcome } from '../StreakResetWelcome'

describe('StreakResetWelcome', () => {
  it('renders heading', () => {
    render(<StreakResetWelcome previousStreak={10} onContinue={vi.fn()} />)
    expect(screen.getByText('Welcome back.')).toBeInTheDocument()
  })

  it('shows previous streak', () => {
    render(<StreakResetWelcome previousStreak={10} onContinue={vi.fn()} />)
    expect(screen.getByText(/previous streak was 10 days/)).toBeInTheDocument()
  })

  it('hides previous streak when <= 1', () => {
    render(<StreakResetWelcome previousStreak={1} onContinue={vi.fn()} />)
    expect(screen.queryByText(/previous streak/)).not.toBeInTheDocument()
  })

  it('Continue button calls onContinue', () => {
    const onContinue = vi.fn()
    render(<StreakResetWelcome previousStreak={10} onContinue={onContinue} />)
    fireEvent.click(screen.getByText('Continue'))
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('Continue button has min tap target', () => {
    render(<StreakResetWelcome previousStreak={10} onContinue={vi.fn()} />)
    const button = screen.getByText('Continue')
    expect(button.className).toContain('min-h-[44px]')
  })
})
