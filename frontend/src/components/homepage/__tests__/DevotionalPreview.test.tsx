import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DevotionalPreview } from '../previews/DevotionalPreview'

describe('DevotionalPreview', () => {
  it('renders date, quote, and passage reference', () => {
    render(<DevotionalPreview />)
    expect(screen.getByText('April 2, 2026')).toBeInTheDocument()
    expect(
      screen.getByText(/Be still, and know that I am God/)
    ).toBeInTheDocument()
    expect(screen.getByText('Psalm 46:10 (WEB)')).toBeInTheDocument()
  })

  it('uses font-script class for the quote', () => {
    render(<DevotionalPreview />)
    const quote = screen.getByText(/Be still, and know that I am God/)
    expect(quote.className).toContain('font-script')
  })

  it('renders pill buttons as non-interactive spans', () => {
    render(<DevotionalPreview />)
    const journal = screen.getByText('Journal about this')
    const pray = screen.getByText('Pray about this')
    expect(journal.tagName).toBe('SPAN')
    expect(pray.tagName).toBe('SPAN')
    expect(journal.getAttribute('role')).toBeNull()
    expect(pray.getAttribute('role')).toBeNull()
  })
})
