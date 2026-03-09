import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MusicHint } from '../MusicHint'

describe('MusicHint', () => {
  it('renders with role="status"', () => {
    render(
      <MusicHint
        text="Tap any sound"
        visible
        position="above"
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('not in DOM when visible=false', () => {
    const { container } = render(
      <MusicHint
        text="Tap any sound"
        visible={false}
        position="above"
        onDismiss={() => {}}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('calls onDismiss when dismiss button is activated', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <MusicHint
        text="Tap any sound"
        visible
        position="above"
        onDismiss={onDismiss}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Dismiss hint' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
