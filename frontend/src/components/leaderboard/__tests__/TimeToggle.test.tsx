import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeToggle } from '../TimeToggle'

describe('TimeToggle', () => {
  it('renders "This Week" and "All Time"', () => {
    render(<TimeToggle activeRange="weekly" onRangeChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'This Week' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'All Time' })).toBeInTheDocument()
  })

  it('defaults to "This Week" checked', () => {
    render(<TimeToggle activeRange="weekly" onRangeChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'This Week' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'All Time' })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onRangeChange when clicking All Time', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeToggle activeRange="weekly" onRangeChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'All Time' }))
    expect(onChange).toHaveBeenCalledWith('allTime')
  })
})
