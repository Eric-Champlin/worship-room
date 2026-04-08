import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { VerseBookmarkMarker } from '../VerseBookmarkMarker'

describe('VerseBookmarkMarker', () => {
  it('renders SVG bookmark icon', () => {
    const { container } = render(<VerseBookmarkMarker />)

    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelector('path')).not.toBeNull()
  })

  it('uses --bookmark-marker CSS variable', () => {
    const { container } = render(<VerseBookmarkMarker />)

    const svg = container.querySelector('svg')
    expect(svg!.style.color).toBe('var(--bookmark-marker)')
  })

  it('has aria-hidden="true"', () => {
    const { container } = render(<VerseBookmarkMarker />)

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('has bookmark-marker CSS class for hover targeting', () => {
    const { container } = render(<VerseBookmarkMarker />)

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.classList.contains('bookmark-marker')).toBe(true)
  })
})
