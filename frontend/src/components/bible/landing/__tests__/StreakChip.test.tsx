import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StreakChip } from '../StreakChip'

describe('StreakChip', () => {
  it('renders streak count', () => {
    render(<StreakChip streak={{ count: 5, lastReadDate: '2026-04-07' }} />)
    expect(screen.getByText('5 day streak')).toBeInTheDocument()
  })

  it('renders flame icon', () => {
    const { container } = render(
      <StreakChip streak={{ count: 3, lastReadDate: '2026-04-07' }} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('hidden when streak is null', () => {
    const { container } = render(<StreakChip streak={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('hidden when count is 0', () => {
    const { container } = render(
      <StreakChip streak={{ count: 0, lastReadDate: '2026-04-07' }} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(
      <StreakChip streak={{ count: 7, lastReadDate: '2026-04-07' }} onClick={handleClick} />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('shows subtle glow for streak <= 7', () => {
    const { container } = render(
      <StreakChip streak={{ count: 5, lastReadDate: '2026-04-07' }} />
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('12px')
  })

  it('shows intense glow for streak > 7', () => {
    const { container } = render(
      <StreakChip streak={{ count: 10, lastReadDate: '2026-04-07' }} />
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('20px')
  })

  it('has transition-all class for smooth shadow transition', () => {
    const { container } = render(
      <StreakChip streak={{ count: 3, lastReadDate: '2026-04-07' }} />
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('transition-all')
    expect(button?.className).toContain('duration-300')
  })

  it('has minimum 44px tap target', () => {
    const { container } = render(
      <StreakChip streak={{ count: 1, lastReadDate: '2026-04-07' }} />
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('min-h-[44px]')
  })
})
