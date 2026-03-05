import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KaraokeText } from '../KaraokeText'

describe('KaraokeText', () => {
  it('renders all words from the text', () => {
    render(<KaraokeText text="Hello world today" currentWordIndex={-1} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('world')).toBeInTheDocument()
    expect(screen.getByText('today')).toBeInTheDocument()
  })

  it('highlights the word at currentWordIndex', () => {
    render(<KaraokeText text="Hello world today" currentWordIndex={1} />)
    const highlighted = screen.getByText('world')
    expect(highlighted.className).toContain('bg-primary')
  })

  it('does not highlight when index is -1', () => {
    render(<KaraokeText text="Hello world" currentWordIndex={-1} />)
    const word = screen.getByText('Hello')
    expect(word.className).not.toContain('bg-primary')
  })

  it('applies custom className', () => {
    const { container } = render(
      <KaraokeText
        text="Hello"
        currentWordIndex={-1}
        className="custom-class"
      />,
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
