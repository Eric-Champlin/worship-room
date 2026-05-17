import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FromFriendChip } from '../FromFriendChip'

describe('FromFriendChip', () => {
  it('renders the "From a friend" text', () => {
    render(<FromFriendChip />)
    expect(screen.getByText('From a friend')).toBeInTheDocument()
  })

  it('decorative icon carries aria-hidden="true"', () => {
    const { container } = render(<FromFriendChip />)
    // The Lucide Users icon renders as an svg.
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('is NOT interactive (Gate-G-CHIP-VISUAL-ONLY)', () => {
    const { container } = render(<FromFriendChip />)
    expect(container.querySelector('[role="button"]')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('has min-h-[44px] touch target class for chip-row consistency', () => {
    const chip = render(<FromFriendChip />).getByTestId('from-friend-chip')
    expect(chip).toHaveClass('min-h-[44px]')
  })
})
