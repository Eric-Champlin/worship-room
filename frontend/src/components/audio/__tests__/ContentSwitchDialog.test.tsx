import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ContentSwitchDialog } from '../ContentSwitchDialog'

const DEFAULT_PROPS = {
  currentTitle: 'The Lord is My Shepherd',
  remainingTime: 180,
  newTitle: 'God is Our Refuge',
  onSwitch: vi.fn(),
  onKeepListening: vi.fn(),
}

describe('ContentSwitchDialog', () => {
  it('renders current title and new title in dialog message', () => {
    render(<ContentSwitchDialog {...DEFAULT_PROPS} />)

    expect(screen.getByText('The Lord is My Shepherd')).toBeInTheDocument()
    expect(screen.getByText('God is Our Refuge')).toBeInTheDocument()
  })

  it('renders formatted remaining time', () => {
    render(<ContentSwitchDialog {...DEFAULT_PROPS} remainingTime={495} />)

    expect(screen.getByText(/8:15/)).toBeInTheDocument()
  })

  it('"Switch" button calls onSwitch', async () => {
    const onSwitch = vi.fn()
    render(<ContentSwitchDialog {...DEFAULT_PROPS} onSwitch={onSwitch} />)

    await userEvent.click(screen.getByRole('button', { name: 'Switch' }))
    expect(onSwitch).toHaveBeenCalledOnce()
  })

  it('"Keep Listening" button calls onKeepListening', async () => {
    const onKeepListening = vi.fn()
    render(
      <ContentSwitchDialog {...DEFAULT_PROPS} onKeepListening={onKeepListening} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Keep Listening' }))
    expect(onKeepListening).toHaveBeenCalledOnce()
  })

  it('has role="alertdialog" and aria-modal="true"', () => {
    render(<ContentSwitchDialog {...DEFAULT_PROPS} />)

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
