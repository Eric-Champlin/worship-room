import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContinueReadingCallout } from '../ContinueReadingCallout'

describe('ContinueReadingCallout', () => {
  it('renders chapter number and relative time', () => {
    render(
      <ContinueReadingCallout
        bookName="Romans"
        chapter={8}
        timestamp={Date.now() - 3600 * 1000} // 1 hour ago
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('Continue reading')).toBeInTheDocument()
    expect(screen.getByText(/Chapter 8/)).toBeInTheDocument()
    expect(screen.getByText(/1h ago/)).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    render(
      <ContinueReadingCallout
        bookName="Romans"
        chapter={8}
        timestamp={Date.now()}
        onSelect={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Continue reading Romans chapter 8' }),
    ).toBeInTheDocument()
  })

  it('onClick fires callback', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ContinueReadingCallout
        bookName="Romans"
        chapter={8}
        timestamp={Date.now()}
        onSelect={onSelect}
      />,
    )
    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledOnce()
  })
})
