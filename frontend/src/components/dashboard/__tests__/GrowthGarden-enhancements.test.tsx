import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GrowthGarden } from '../GrowthGarden'
import type { GardenActivityElements } from '@/hooks/useGardenElements'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

const ALL_ACTIVITIES: GardenActivityElements = {
  writingDesk: true,
  cushion: true,
  candle: true,
  bible: true,
  windChime: true,
}

const NO_ACTIVITIES: GardenActivityElements = {
  writingDesk: false,
  cushion: false,
  candle: false,
  bible: false,
  windChime: false,
}

describe('GrowthGarden Enhancements', () => {
  describe('seasonal overlays', () => {
    it('renders seasonal snow overlay for Advent', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" seasonName="Advent" hourOverride={12} />,
      )
      expect(container.querySelector('[data-testid="garden-seasonal-overlay"]')).toBeInTheDocument()
      expect(container.querySelectorAll('[data-testid="garden-snow"]').length).toBeGreaterThan(0)
    })

    it('renders ground snow for Christmas', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" seasonName="Christmas" hourOverride={12} />,
      )
      expect(container.querySelector('[data-testid="garden-ground-snow"]')).toBeInTheDocument()
    })

    it('renders Easter flowers', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" seasonName="Easter" hourOverride={12} />,
      )
      expect(container.querySelectorAll('[data-testid="garden-easter-flower"]').length).toBe(5)
    })

    it('renders Holy Week cross', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" seasonName="Holy Week" hourOverride={12} />,
      )
      expect(container.querySelector('[data-testid="garden-cross"]')).toBeInTheDocument()
    })

    it('renders no overlay for Ordinary Time', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" seasonName="Ordinary Time" hourOverride={12} />,
      )
      expect(
        container.querySelector('[data-testid="garden-seasonal-overlay"]'),
      ).not.toBeInTheDocument()
    })

    it('applies Lent desaturation filter', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" seasonName="Lent" hourOverride={12} />,
      )
      // The stage content should be wrapped in a <g> with CSS filter
      const filteredGroup = container.querySelector('g[style*="saturate(0.7)"]')
      expect(filteredGroup).toBeInTheDocument()
    })
  })

  describe('activity elements', () => {
    it('renders writing desk when journal >= 10', () => {
      const { container } = render(
        <GrowthGarden
          stage={4}
          size="lg"
          activityElements={{ ...NO_ACTIVITIES, writingDesk: true }}
          hourOverride={12}
        />,
      )
      expect(
        container.querySelector('[data-testid="garden-activity-writingDesk"]'),
      ).toBeInTheDocument()
    })

    it('renders cushion when meditation >= 10', () => {
      const { container } = render(
        <GrowthGarden
          stage={4}
          size="lg"
          activityElements={{ ...NO_ACTIVITIES, cushion: true }}
          hourOverride={12}
        />,
      )
      expect(
        container.querySelector('[data-testid="garden-activity-cushion"]'),
      ).toBeInTheDocument()
    })

    it('hides wind chime at stages 1-2', () => {
      const { container } = render(
        <GrowthGarden stage={1} size="lg" activityElements={ALL_ACTIVITIES} hourOverride={12} />,
      )
      expect(
        container.querySelector('[data-testid="garden-activity-windChime"]'),
      ).not.toBeInTheDocument()
    })

    it('shows wind chime at stage 3+', () => {
      const { container } = render(
        <GrowthGarden stage={3} size="lg" activityElements={ALL_ACTIVITIES} hourOverride={12} />,
      )
      expect(
        container.querySelector('[data-testid="garden-activity-windChime"]'),
      ).toBeInTheDocument()
    })

    it('limits to 3 elements at stage 1', () => {
      const { container } = render(
        <GrowthGarden stage={1} size="lg" activityElements={ALL_ACTIVITIES} hourOverride={12} />,
      )
      const elements = container.querySelector('[data-testid="garden-activity-elements"]')
      expect(elements).toBeInTheDocument()
      // Should have exactly 3 activity children (wind chime excluded at stage 1, 4 remain, limited to 3)
      const activityItems = container.querySelectorAll('[data-testid^="garden-activity-"]')
      // Subtract the parent garden-activity-elements testid
      const childCount = activityItems.length - 1
      expect(childCount).toBe(3)
    })
  })

  describe('time-of-day sky', () => {
    it('renders moon at night (hour 23)', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" hourOverride={23} />,
      )
      expect(container.querySelector('[data-testid="garden-moon"]')).toBeInTheDocument()
    })

    it('renders stars at dusk (hour 20)', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" hourOverride={20} />,
      )
      const stars = container.querySelectorAll('[data-testid="garden-star"]')
      expect(stars.length).toBe(3)
    })

    it('renders fireflies at night', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" hourOverride={23} />,
      )
      const fireflies = container.querySelectorAll('[data-testid="garden-firefly"]')
      expect(fireflies.length).toBe(3)
    })

    it('renders sun during day (hour 12)', () => {
      render(
        <GrowthGarden stage={4} size="lg" streakActive={true} hourOverride={12} />,
      )
      expect(screen.getByTestId('garden-sun')).toBeInTheDocument()
    })

    it('does not render moon during day', () => {
      const { container } = render(
        <GrowthGarden stage={4} size="lg" hourOverride={12} />,
      )
      expect(container.querySelector('[data-testid="garden-moon"]')).not.toBeInTheDocument()
    })
  })

  describe('backward compatibility', () => {
    it('renders correctly with only original props', () => {
      render(
        <GrowthGarden stage={3} size="lg" animated={true} streakActive={true} />,
      )
      expect(screen.getByTestId('garden-stage-3')).toBeInTheDocument()
    })
  })

  describe('regression — all 6 stages with all enhancements', () => {
    it.each([1, 2, 3, 4, 5, 6] as const)(
      'stage %i renders correctly with all enhancements',
      (stage) => {
        const { container } = render(
          <GrowthGarden
            stage={stage}
            size="lg"
            animated={true}
            streakActive={true}
            seasonName="Easter"
            activityElements={ALL_ACTIVITIES}
            hourOverride={23}
          />,
        )
        // Stage content present
        expect(container.querySelector(`[data-testid="garden-stage-${stage}"]`)).toBeInTheDocument()
        // Night sky elements present
        expect(container.querySelector('[data-testid="garden-moon"]')).toBeInTheDocument()
        // Seasonal overlay present
        expect(container.querySelector('[data-testid="garden-seasonal-overlay"]')).toBeInTheDocument()
        // Activity elements present
        expect(container.querySelector('[data-testid="garden-activity-elements"]')).toBeInTheDocument()
        // No crash
      },
    )

    it('renders all three overlays simultaneously at stage 4', () => {
      const { container } = render(
        <GrowthGarden
          stage={4}
          size="lg"
          seasonName="Easter"
          activityElements={ALL_ACTIVITIES}
          hourOverride={21}
        />,
      )
      // Easter flowers
      expect(container.querySelectorAll('[data-testid="garden-easter-flower"]').length).toBe(5)
      // Activity elements
      expect(container.querySelector('[data-testid="garden-activity-elements"]')).toBeInTheDocument()
      // Dusk stars
      expect(container.querySelectorAll('[data-testid="garden-star"]').length).toBe(3)
    })
  })

  describe('performance safeguard', () => {
    it('total SVG child elements stay under 200', () => {
      const { container } = render(
        <GrowthGarden
          stage={6}
          size="lg"
          animated={true}
          streakActive={true}
          seasonName="Christmas"
          activityElements={ALL_ACTIVITIES}
          hourOverride={23}
        />,
      )
      const svg = container.querySelector('svg[role="img"]')
      expect(svg).toBeInTheDocument()
      const allElements = svg!.querySelectorAll('*')
      expect(allElements.length).toBeLessThan(200)
    })
  })
})
