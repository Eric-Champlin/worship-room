import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GrowthPreview } from '../previews/GrowthPreview'

describe('GrowthPreview', () => {
  it('renders SVG garden with aria-hidden', () => {
    const { container } = render(<GrowthPreview />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders stat text', () => {
    render(<GrowthPreview />)
    expect(screen.getByText('14-day streak')).toBeInTheDocument()
    expect(screen.getByText(/Day 5 of 21/)).toBeInTheDocument()
  })
})
