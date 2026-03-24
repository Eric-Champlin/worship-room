import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GrowthGarden } from '../GrowthGarden'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

describe('GrowthGarden — Sparkle Effect', () => {
  it('renders particles when showSparkle is true', () => {
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    expect(screen.queryByTestId('garden-sparkle')).not.toBeInTheDocument()

    rerender(<GrowthGarden stage={3} size="lg" showSparkle={true} />)
    expect(screen.getByTestId('garden-sparkle')).toBeInTheDocument()
  })

  it('renders 3-4 particles for normal sparkle', () => {
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    rerender(
      <GrowthGarden stage={3} size="lg" showSparkle={true} amplifiedSparkle={false} />,
    )
    const particles = screen.getAllByTestId('garden-sparkle-particle')
    expect(particles.length).toBeGreaterThanOrEqual(3)
    expect(particles.length).toBeLessThanOrEqual(4)
  })

  it('renders 8-10 particles for amplified sparkle', () => {
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    rerender(
      <GrowthGarden stage={3} size="lg" showSparkle={true} amplifiedSparkle={true} />,
    )
    const particles = screen.getAllByTestId('garden-sparkle-particle')
    expect(particles.length).toBeGreaterThanOrEqual(8)
    expect(particles.length).toBeLessThanOrEqual(10)
  })

  it('particles have correct color classes', () => {
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    rerender(
      <GrowthGarden stage={3} size="lg" showSparkle={true} amplifiedSparkle={false} />,
    )
    const particle = screen.getAllByTestId('garden-sparkle-particle')[0]
    expect(particle.className).toContain('bg-[rgba(109,40,217,0.5)]')
  })

  it('amplified particles have brighter color classes', () => {
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    rerender(
      <GrowthGarden stage={3} size="lg" showSparkle={true} amplifiedSparkle={true} />,
    )
    const particle = screen.getAllByTestId('garden-sparkle-particle')[0]
    expect(particle.className).toContain('bg-[rgba(109,40,217,0.7)]')
  })

  it('no particles when prefers-reduced-motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    rerender(<GrowthGarden stage={3} size="lg" showSparkle={true} />)
    expect(screen.queryByTestId('garden-sparkle')).not.toBeInTheDocument()
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('particles removed after animation completes', () => {
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    rerender(<GrowthGarden stage={3} size="lg" showSparkle={true} />)

    const particles = screen.getAllByTestId('garden-sparkle-particle')
    // Fire animationEnd on all particles
    particles.forEach((p) => fireEvent.animationEnd(p))

    expect(screen.queryByTestId('garden-sparkle')).not.toBeInTheDocument()
  })
})
