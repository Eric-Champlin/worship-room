import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptySearchResults } from '../EmptySearchResults'

describe('EmptySearchResults', () => {
  it('renders heading with user query', () => {
    render(<EmptySearchResults query="anxious" onClear={vi.fn()} />)
    expect(screen.getByText('No matches for "anxious"')).toBeInTheDocument()
  })

  it('renders descriptive subtext', () => {
    render(<EmptySearchResults query="anxious" onClear={vi.fn()} />)
    expect(
      screen.getByText('Try a different word, or clear the search to see everything.'),
    ).toBeInTheDocument()
  })

  it('renders "Clear search" button', () => {
    render(<EmptySearchResults query="anxious" onClear={vi.fn()} />)
    expect(screen.getByText('Clear search')).toBeInTheDocument()
  })

  it('calls onClear when button clicked', () => {
    const onClear = vi.fn()
    render(<EmptySearchResults query="anxious" onClear={onClear} />)
    fireEvent.click(screen.getByText('Clear search'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
