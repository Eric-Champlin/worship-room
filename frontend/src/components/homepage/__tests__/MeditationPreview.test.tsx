import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MeditationPreview } from '../previews/MeditationPreview'

describe('MeditationPreview', () => {
  it('renders 6 sound tile labels', () => {
    render(<MeditationPreview />)
    expect(screen.getByText('Rain')).toBeInTheDocument()
    expect(screen.getByText('Ocean')).toBeInTheDocument()
    expect(screen.getByText('Forest')).toBeInTheDocument()
    expect(screen.getByText('Fireplace')).toBeInTheDocument()
    expect(screen.getByText('Night')).toBeInTheDocument()
    expect(screen.getByText('Stream')).toBeInTheDocument()
  })

  it('marks Rain and Ocean tiles as active with border styling', () => {
    const { container } = render(<MeditationPreview />)
    const tiles = container.querySelectorAll('.grid > div')
    // Rain and Ocean are first two
    expect(tiles[0].className).toContain('border-purple-500/30')
    expect(tiles[1].className).toContain('border-purple-500/30')
    // Forest should not have active border
    expect(tiles[2].className).not.toContain('border-purple-500/30')
  })

  it('renders 2 volume bars', () => {
    const { container } = render(<MeditationPreview />)
    const bars = container.querySelectorAll('.bg-purple-500\\/40')
    expect(bars).toHaveLength(2)
  })
})
