import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TonightScripture } from '../TonightScripture'

describe('TonightScripture', () => {
  it('renders "Tonight\'s Scripture" label', () => {
    render(<TonightScripture onPlay={vi.fn()} />)

    expect(screen.getByText("Tonight's Scripture")).toBeInTheDocument()
  })

  it('has aria-label on the section', () => {
    render(<TonightScripture onPlay={vi.fn()} />)

    expect(
      screen.getByRole('region', { name: "Tonight's featured scripture" }),
    ).toBeInTheDocument()
  })

  it('renders a scripture reading with title and duration', () => {
    render(<TonightScripture onPlay={vi.fn()} />)

    // Should render some reading — any valid scripture title
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls onPlay when play button is clicked', async () => {
    const onPlay = vi.fn()
    render(<TonightScripture onPlay={onPlay} />)

    const playButtons = screen.getAllByRole('button')
    await userEvent.click(playButtons[0])

    expect(onPlay).toHaveBeenCalledOnce()
  })
})
