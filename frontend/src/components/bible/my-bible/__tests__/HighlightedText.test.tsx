import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { HighlightedText } from '../HighlightedText'

describe('HighlightedText', () => {
  it('renders plain text when query is empty', () => {
    const { container } = render(<HighlightedText text="hello world" query="" />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(container.textContent).toBe('hello world')
  })

  it('highlights single token match', () => {
    const { container } = render(<HighlightedText text="find peace" query="peace" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('peace')
  })

  it('highlights multiple occurrences', () => {
    const { container } = render(<HighlightedText text="peace and peace" query="peace" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(2)
  })

  it('highlights multiple tokens independently', () => {
    const { container } = render(<HighlightedText text="anxious peace" query="anxious peace" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(2)
    expect(marks[0].textContent).toBe('anxious')
    expect(marks[1].textContent).toBe('peace')
  })

  it('is case-insensitive', () => {
    const { container } = render(<HighlightedText text="Peace" query="peace" />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('Peace')
  })

  it('does not highlight when no match', () => {
    const { container } = render(<HighlightedText text="hello" query="xyz" />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(container.textContent).toBe('hello')
  })

  it('escapes regex special characters in query', () => {
    const { container } = render(<HighlightedText text="hello. world" query="hello." />)
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('hello.')
  })

  it('uses design system mark styling', () => {
    const { container } = render(<HighlightedText text="find peace" query="peace" />)
    const mark = container.querySelector('mark')
    expect(mark?.className).toContain('bg-primary/25')
    expect(mark?.className).toContain('text-white')
  })
})
