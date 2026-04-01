import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GrowthGarden, STAGE_LABELS } from '../GrowthGarden'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

describe('GrowthGarden — Accessibility', () => {
  it.each([1, 2, 3, 4, 5, 6] as const)('stage %i SVG has role="img"', (stage) => {
    render(<GrowthGarden stage={stage} size="lg" />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it.each([1, 2, 3, 4, 5, 6] as const)('stage %i has descriptive aria-label', (stage) => {
    render(<GrowthGarden stage={stage} size="lg" hourOverride={12} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label', STAGE_LABELS[stage])
  })

  it('no animation classes when prefers-reduced-motion is set', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { container } = render(<GrowthGarden stage={6} size="lg" animated={true} />)

    // No garden-specific animation classes should be applied
    expect(container.querySelectorAll('.garden-leaf').length).toBe(0)
    expect(container.querySelectorAll('.garden-butterfly').length).toBe(0)
    expect(container.querySelectorAll('.garden-water').length).toBe(0)
    expect(container.querySelectorAll('.garden-glow').length).toBe(0)

    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('sparkle particles respect reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { rerender } = render(
      <GrowthGarden stage={3} size="lg" showSparkle={false} />,
    )
    rerender(<GrowthGarden stage={3} size="lg" showSparkle={true} />)

    expect(screen.queryByTestId('garden-sparkle')).not.toBeInTheDocument()
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('crossfade respects reduced motion (instant switch)', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { rerender } = render(<GrowthGarden stage={2} size="lg" animated={true} />)
    rerender(<GrowthGarden stage={3} size="lg" animated={true} />)

    expect(screen.queryByTestId('garden-transition-old')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', STAGE_LABELS[3])

    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('garden is not interactive (no button, link, or interactive roles)', () => {
    const { container } = render(<GrowthGarden stage={6} size="lg" />)
    expect(container.querySelectorAll('button').length).toBe(0)
    expect(container.querySelectorAll('a').length).toBe(0)
    expect(container.querySelectorAll('[role="button"]').length).toBe(0)
    expect(container.querySelectorAll('[tabindex]').length).toBe(0)
  })

  it('stage 1 with no streak shows correct garden (edge case)', () => {
    render(<GrowthGarden stage={1} size="lg" streakActive={false} hourOverride={12} />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', STAGE_LABELS[1])
    expect(screen.getByTestId('garden-clouds')).toBeInTheDocument()
    expect(screen.getByTestId('garden-stage-1')).toBeInTheDocument()
  })

  it('stage 6 at max level renders correctly (edge case)', () => {
    render(<GrowthGarden stage={6} size="lg" streakActive={true} hourOverride={12} />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', STAGE_LABELS[6])
    expect(screen.getByTestId('garden-stage-6')).toBeInTheDocument()
    expect(screen.getByTestId('garden-sun')).toBeInTheDocument()
  })

  // --- Enhancement a11y tests ---

  it('aria-label includes season name', () => {
    render(<GrowthGarden stage={4} size="lg" seasonName="Advent" hourOverride={12} />)
    const svg = screen.getByRole('img')
    expect(svg.getAttribute('aria-label')).toContain('during Advent')
  })

  it('aria-label excludes Ordinary Time', () => {
    render(<GrowthGarden stage={4} size="lg" seasonName="Ordinary Time" hourOverride={12} />)
    const svg = screen.getByRole('img')
    expect(svg.getAttribute('aria-label')).not.toContain('Ordinary Time')
  })

  it('aria-label includes "at night" for night time', () => {
    render(<GrowthGarden stage={4} size="lg" hourOverride={23} />)
    const svg = screen.getByRole('img')
    expect(svg.getAttribute('aria-label')).toContain('at night')
  })

  it('static snow when prefers-reduced-motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { container } = render(
      <GrowthGarden stage={4} size="lg" seasonName="Advent" hourOverride={12} />,
    )
    const snowCircles = container.querySelectorAll('[data-testid="garden-snow"]')
    expect(snowCircles.length).toBeGreaterThan(0)
    // Snow should have no animation class
    snowCircles.forEach((el) => {
      expect(el.classList.contains('motion-safe:animate-garden-snow-fall')).toBe(false)
    })
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('static stars when prefers-reduced-motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { container } = render(
      <GrowthGarden stage={4} size="lg" hourOverride={23} />,
    )
    const stars = container.querySelectorAll('[data-testid="garden-star"]')
    expect(stars.length).toBeGreaterThan(0)
    stars.forEach((el) => {
      expect(el.classList.contains('motion-safe:animate-garden-star-twinkle')).toBe(false)
    })
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('activity elements visible without fade when reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { container } = render(
      <GrowthGarden
        stage={4}
        size="lg"
        activityElements={{ writingDesk: true, cushion: true, candle: false, bible: false, windChime: false }}
        hourOverride={12}
      />,
    )
    const elements = container.querySelectorAll('[data-testid^="garden-activity-"]')
    // Should be present (not hidden)
    expect(elements.length).toBeGreaterThan(0)
    // Should have no animation class
    elements.forEach((el) => {
      expect(el.classList.contains('motion-safe:animate-garden-element-fade')).toBe(false)
    })
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  // share button aria-label covered by GardenShareButton.test.tsx
})
