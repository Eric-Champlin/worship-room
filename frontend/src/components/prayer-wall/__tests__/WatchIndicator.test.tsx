import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WatchIndicator } from '../WatchIndicator'

describe('WatchIndicator (Spec 6.4)', () => {
  it('renders "Watch is on" text', () => {
    render(<WatchIndicator />)
    expect(screen.getByText('Watch is on')).toBeInTheDocument()
  })

  it('exposes the canonical aria-label "3am Watch is on"', () => {
    render(<WatchIndicator />)
    expect(screen.getByLabelText('3am Watch is on')).toBeInTheDocument()
  })

  it('is non-interactive (NOT a button or link)', () => {
    render(<WatchIndicator />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('uses Lora italic typography (font-serif italic class)', () => {
    render(<WatchIndicator />)
    const chip = screen.getByLabelText('3am Watch is on')
    expect(chip.className).toContain('font-serif')
    expect(chip.className).toContain('italic')
  })
})
