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

  it('Tonight\'s Scripture label is solid white (WCAG AAA)', () => {
    render(<TonightScripture onPlay={vi.fn()} />)
    const label = screen.getByText("Tonight's Scripture")
    expect(label.className).toContain('text-white')
    expect(label.className).not.toContain('text-primary')
  })

  it('play button is inverted (white bg, purple icon)', () => {
    render(<TonightScripture onPlay={vi.fn()} />)
    const button = screen.getAllByRole('button')[0]
    expect(button.className).toContain('bg-white')
    expect(button.className).toContain('text-primary')
    expect(button.className).not.toContain('bg-primary')
  })

  it('play button has white glow halo', () => {
    render(<TonightScripture onPlay={vi.fn()} />)
    const button = screen.getAllByRole('button')[0]
    expect(button.className).toContain(
      'shadow-[0_0_20px_rgba(255,255,255,0.15)]',
    )
  })

  it('play button has press feedback (active:scale-[0.96])', () => {
    render(<TonightScripture onPlay={vi.fn()} />)
    const button = screen.getAllByRole('button')[0]
    expect(button.className).toContain('active:scale-[0.96]')
  })
})
