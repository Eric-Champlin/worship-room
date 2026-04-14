import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { VerseNoteMarker } from '../VerseNoteMarker'

describe('VerseNoteMarker', () => {
  it('has aria-hidden="true"', () => {
    const { container } = render(<VerseNoteMarker />)

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('has note-marker CSS class for hover targeting', () => {
    const { container } = render(<VerseNoteMarker />)

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.classList.contains('note-marker')).toBe(true)
  })

  it('uses --note-marker CSS variable', () => {
    const { container } = render(<VerseNoteMarker />)

    const svg = container.querySelector('svg')
    expect(svg!.style.color).toBe('var(--note-marker)')
  })
})
