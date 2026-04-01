import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GrowthGarden, STAGE_LABELS } from '../GrowthGarden'
import { DashboardHero } from '../DashboardHero'

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: () => ({ greeting: null, themeColor: null, isNamedSeason: false }),
}))

describe('GrowthGarden', () => {
  describe('stage rendering', () => {
    it.each([1, 2, 3, 4, 5, 6] as const)('renders stage %i with correct aria-label', (stage) => {
      render(<GrowthGarden stage={stage} size="lg" />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', STAGE_LABELS[stage])
    })

    it.each([1, 2, 3, 4, 5, 6] as const)('renders stage %i with unique data-testid', (stage) => {
      render(<GrowthGarden stage={stage} size="lg" />)
      expect(screen.getByTestId(`garden-stage-${stage}`)).toBeInTheDocument()
    })

    it('renders stage 1 with seedling elements (cross marker)', () => {
      const { container } = render(<GrowthGarden stage={1} size="lg" />)
      // Stage 1 has a cross marker (two lines forming a cross)
      const lines = container.querySelectorAll('[data-testid="garden-stage-1"] line')
      expect(lines.length).toBeGreaterThanOrEqual(2)
    })

    it('renders stage 2 with flower bud', () => {
      const { container } = render(<GrowthGarden stage={2} size="lg" />)
      // Stage 2 has a flower bud (purple circle)
      const circles = container.querySelectorAll('[data-testid="garden-stage-2"] circle')
      expect(circles.length).toBeGreaterThanOrEqual(1)
      const purpleCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#6D28D9',
      )
      expect(purpleCircle).toBeTruthy()
    })

    it('renders stage 6 with bench (rect elements)', () => {
      const { container } = render(<GrowthGarden stage={6} size="lg" />)
      const rects = container.querySelectorAll('[data-testid="garden-stage-6"] rect')
      expect(rects.length).toBeGreaterThanOrEqual(3) // bench seat + 2 legs
    })
  })

  describe('size variants', () => {
    it('applies h-[150px] for sm size', () => {
      const { container } = render(<GrowthGarden stage={1} size="sm" />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('h-[150px]')
    })

    it('applies h-[200px] for md size', () => {
      const { container } = render(<GrowthGarden stage={1} size="md" />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('h-[200px]')
    })

    it('applies h-[300px] for lg size', () => {
      const { container } = render(<GrowthGarden stage={1} size="lg" />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('h-[300px]')
    })
  })

  describe('streak-responsive sky', () => {
    it('shows sun when streakActive is true', () => {
      render(<GrowthGarden stage={1} size="lg" streakActive={true} hourOverride={12} />)
      expect(screen.getByTestId('garden-sun')).toBeInTheDocument()
      expect(screen.queryByTestId('garden-clouds')).not.toBeInTheDocument()
    })

    it('shows clouds when streakActive is false', () => {
      render(<GrowthGarden stage={1} size="lg" streakActive={false} hourOverride={12} />)
      expect(screen.getByTestId('garden-clouds')).toBeInTheDocument()
      expect(screen.queryByTestId('garden-sun')).not.toBeInTheDocument()
    })

    it('defaults streakActive to true', () => {
      render(<GrowthGarden stage={1} size="lg" hourOverride={12} />)
      expect(screen.getByTestId('garden-sun')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('SVG has role="img"', () => {
      render(<GrowthGarden stage={1} size="lg" />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it.each([1, 2, 3, 4, 5, 6] as const)('stage %i has a descriptive aria-label', (stage) => {
      render(<GrowthGarden stage={stage} size="lg" />)
      const svg = screen.getByRole('img')
      const label = svg.getAttribute('aria-label')
      expect(label).toBeTruthy()
      expect(label!.length).toBeGreaterThan(10)
    })
  })

  describe('animations', () => {
    it('applies animation classes when animated=true (stage 3+)', () => {
      const { container } = render(<GrowthGarden stage={3} size="lg" animated={true} />)
      const leafElements = container.querySelectorAll('.garden-leaf')
      expect(leafElements.length).toBeGreaterThan(0)
      const hasMotionSafe = Array.from(leafElements).some((el) =>
        (el.className as unknown as SVGAnimatedString).baseVal.includes('motion-safe:animate-garden-leaf-sway'),
      )
      expect(hasMotionSafe).toBe(true)
    })

    it('no animation classes when animated=false', () => {
      const { container } = render(<GrowthGarden stage={3} size="lg" animated={false} />)
      const animatedElements = container.querySelectorAll(
        '.garden-leaf, .garden-butterfly, .garden-water, .garden-glow',
      )
      expect(animatedElements.length).toBe(0)
    })

    it('uses motion-safe prefix on animation classes', () => {
      const { container } = render(<GrowthGarden stage={6} size="lg" animated={true} />)
      const animatedEl = container.querySelector('.garden-leaf')
      expect(animatedEl).toBeTruthy()
      expect((animatedEl!.className as unknown as SVGAnimatedString).baseVal).toContain('motion-safe:')
    })

    it('no leaf sway animations on stages 1-2', () => {
      const { container: c1 } = render(<GrowthGarden stage={1} size="lg" animated={true} />)
      expect(c1.querySelectorAll('.garden-leaf').length).toBe(0)

      const { container: c2 } = render(<GrowthGarden stage={2} size="lg" animated={true} />)
      expect(c2.querySelectorAll('.garden-leaf').length).toBe(0)
    })

    it('butterfly float animations present on stage 3+', () => {
      const { container } = render(<GrowthGarden stage={3} size="lg" animated={true} />)
      const butterflies = container.querySelectorAll('.garden-butterfly')
      expect(butterflies.length).toBeGreaterThan(0)
    })

    it('water shimmer animations present on stage 5+', () => {
      const { container } = render(<GrowthGarden stage={5} size="lg" animated={true} />)
      const water = container.querySelectorAll('.garden-water')
      expect(water.length).toBeGreaterThan(0)
    })

    it('glow pulse animation present on stage 6 only', () => {
      const { container: c5 } = render(<GrowthGarden stage={5} size="lg" animated={true} />)
      expect(c5.querySelectorAll('.garden-glow').length).toBe(0)

      const { container: c6 } = render(<GrowthGarden stage={6} size="lg" animated={true} />)
      expect(c6.querySelectorAll('.garden-glow').length).toBeGreaterThan(0)
    })
  })

  describe('color palette', () => {
    it('uses primary purple (#6D28D9) for flowers', () => {
      const { container } = render(<GrowthGarden stage={3} size="lg" />)
      const purpleCircles = container.querySelectorAll(`circle[fill="#6D28D9"]`)
      expect(purpleCircles.length).toBeGreaterThan(0)
    })

    it('uses amber (#D97706) in stage 3+', () => {
      const { container } = render(<GrowthGarden stage={3} size="lg" />)
      const amberElements = container.querySelectorAll(`[fill="#D97706"]`)
      expect(amberElements.length).toBeGreaterThan(0)
    })

    it('uses stream blue (#60A5FA) in stage 5', () => {
      const { container } = render(<GrowthGarden stage={5} size="lg" />)
      const blueElements = container.querySelectorAll(`[stroke="#60A5FA"]`)
      expect(blueElements.length).toBeGreaterThan(0)
    })
  })

  describe('dashboard integration (gardenSlot)', () => {
    it('renders garden in DashboardHero via gardenSlot', () => {
      render(
        <DashboardHero
          userName="Eric"
          gardenSlot={
            <div>
              <p className="text-xs text-white/60">Your Garden</p>
              <GrowthGarden stage={3} size="lg" animated={true} streakActive={true} />
            </div>
          }
        />,
      )
      expect(screen.getByText('Your Garden')).toBeInTheDocument()
      expect(screen.getByRole('img')).toHaveAttribute(
        'aria-label',
        STAGE_LABELS[3],
      )
    })

    it('existing DashboardHero content unchanged when gardenSlot is provided', () => {
      render(
        <DashboardHero
          userName="Eric"
          currentStreak={5}
          levelName="Blooming"
          totalPoints={600}
          gardenSlot={<GrowthGarden stage={3} size="lg" />}
        />,
      )
      expect(screen.getByText(/Eric/)).toBeInTheDocument()
      expect(screen.getByText(/5 days streak/)).toBeInTheDocument()
      expect(screen.getByText('Blooming')).toBeInTheDocument()
    })

    it('DashboardHero renders without gardenSlot (backward compatible)', () => {
      render(<DashboardHero userName="Eric" />)
      expect(screen.getByText(/Eric/)).toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('garden reflects correct stage based on level', () => {
      render(<GrowthGarden stage={5} size="lg" />)
      expect(screen.getByRole('img')).toHaveAttribute(
        'aria-label',
        STAGE_LABELS[5],
      )
    })

    it('garden shows sun when streak active', () => {
      render(
        <DashboardHero
          userName="Eric"
          currentStreak={3}
          gardenSlot={<GrowthGarden stage={2} size="lg" streakActive={true} hourOverride={12} />}
        />,
      )
      expect(screen.getByTestId('garden-sun')).toBeInTheDocument()
    })

    it('garden shows overcast when streak is 0', () => {
      render(
        <DashboardHero
          userName="Eric"
          currentStreak={0}
          gardenSlot={<GrowthGarden stage={2} size="lg" streakActive={false} hourOverride={12} />}
        />,
      )
      expect(screen.getByTestId('garden-clouds')).toBeInTheDocument()
    })
  })

  describe('rainbow', () => {
    it('renders rainbow when showRainbow=true', () => {
      render(<GrowthGarden stage={3} size="lg" showRainbow={true} />)
      expect(screen.getByTestId('garden-rainbow')).toBeInTheDocument()
    })

    it('does not render rainbow when showRainbow=false', () => {
      render(<GrowthGarden stage={3} size="lg" showRainbow={false} />)
      expect(screen.queryByTestId('garden-rainbow')).not.toBeInTheDocument()
    })

    it('does not render rainbow by default', () => {
      render(<GrowthGarden stage={3} size="lg" />)
      expect(screen.queryByTestId('garden-rainbow')).not.toBeInTheDocument()
    })

    it('rainbow starts at opacity 0 for fade-in animation', () => {
      render(<GrowthGarden stage={3} size="lg" showRainbow={true} />)
      const rainbow = screen.getByTestId('garden-rainbow')
      // Starts at 0 — CSS transition to 0.35 happens after rAF
      expect(rainbow.style.opacity).toBe('0')
    })

    it('rainbow transitions to target opacity after mount', async () => {
      render(<GrowthGarden stage={3} size="lg" showRainbow={true} />)
      const rainbow = screen.getByTestId('garden-rainbow')
      // After rAF fires, opacity becomes 0.35
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r))
      })
      expect(rainbow.style.opacity).toBe('0.35')
    })

    it('rainbow has motion-reduce class for accessibility', () => {
      render(<GrowthGarden stage={3} size="lg" showRainbow={true} />)
      const rainbow = screen.getByTestId('garden-rainbow')
      expect(rainbow.getAttribute('class')).toContain('motion-reduce:opacity-40')
    })
  })
})
