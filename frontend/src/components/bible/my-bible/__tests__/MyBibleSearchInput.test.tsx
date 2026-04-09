import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MyBibleSearchInput } from '../MyBibleSearchInput'

describe('MyBibleSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders search input with magnifying glass icon', () => {
    render(<MyBibleSearchInput value="" onChange={vi.fn()} />)
    expect(
      screen.getByLabelText('Search your highlights, notes, prayers, and bookmarks'),
    ).toBeInTheDocument()
    // Search icon (Lucide renders as SVG)
    expect(document.querySelector('svg.lucide-search')).toBeInTheDocument()
  })

  it('renders placeholder text', () => {
    render(<MyBibleSearchInput value="" onChange={vi.fn()} />)
    expect(
      screen.getByPlaceholderText('Search your highlights, notes, prayers...'),
    ).toBeInTheDocument()
  })

  it('does not show X button when input is empty', () => {
    render(<MyBibleSearchInput value="" onChange={vi.fn()} />)
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  it('shows X button when input has value', () => {
    render(<MyBibleSearchInput value="test" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('calls onChange after debounce on typing', async () => {
    const onChange = vi.fn()
    render(<MyBibleSearchInput value="" onChange={onChange} />)

    const input = screen.getByLabelText('Search your highlights, notes, prayers, and bookmarks')
    fireEvent.change(input, { target: { value: 'test' } })

    // Before debounce, onChange should not have been called
    expect(onChange).not.toHaveBeenCalled()

    // After debounce
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onChange).toHaveBeenCalledWith('test')
  })

  it('clears input and calls onChange on X button click', async () => {
    const onChange = vi.fn()
    render(<MyBibleSearchInput value="test" onChange={onChange} />)

    const clearButton = screen.getByLabelText('Clear search')
    fireEvent.click(clearButton)

    expect(onChange).toHaveBeenCalledWith('')
  })

  it('clears input and blurs on Escape', () => {
    const onChange = vi.fn()
    render(<MyBibleSearchInput value="test" onChange={onChange} />)

    const input = screen.getByLabelText('Search your highlights, notes, prayers, and bookmarks')
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onChange).toHaveBeenCalledWith('')
    expect(input).not.toHaveFocus()
  })

  it('meets 44px min-height', () => {
    render(<MyBibleSearchInput value="" onChange={vi.fn()} />)
    const input = screen.getByLabelText('Search your highlights, notes, prayers, and bookmarks')
    expect(input.className).toContain('min-h-[44px]')
  })

  it('X button meets 44px tap target', () => {
    render(<MyBibleSearchInput value="test" onChange={vi.fn()} />)
    const clearButton = screen.getByLabelText('Clear search')
    expect(clearButton.className).toContain('min-h-[44px]')
    expect(clearButton.className).toContain('min-w-[44px]')
  })
})
