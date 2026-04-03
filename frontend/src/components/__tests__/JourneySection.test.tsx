import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { JourneySection } from '@/components/JourneySection'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (index: number, base: number, initial: number = 0) => ({
    transitionDelay: `${initial + index * base}ms`,
  }),
}))

function renderJourney() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <JourneySection />
    </MemoryRouter>
  )
}

const STEP_ROUTES = [
  '/daily?tab=devotional',
  '/daily?tab=pray',
  '/daily?tab=journal',
  '/daily?tab=meditate',
  '/music',
  '/prayer-wall',
  '/local-support/churches',
]

const STEP_DESCRIPTIONS = [
  /start each morning/i,
  /begin with what.s on your heart/i,
  /write freely or follow/i,
  /quiet your mind/i,
  /layer ambient sounds/i,
  /you.re not alone/i,
  /discover churches/i,
]

describe('JourneySection', () => {
  describe('Structure & Semantics', () => {
    it('renders as a named section landmark', () => {
      renderJourney()
      expect(
        screen.getByRole('region', { name: /your journey to.*healing/i })
      ).toBeInTheDocument()
    })

    it('renders h2 with topLine and bottomLine', () => {
      renderJourney()
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent(/your journey to/i)
      expect(heading).toHaveTextContent(/healing/i)
      const spans = heading.querySelectorAll('span')
      expect(spans.length).toBeGreaterThanOrEqual(2)
    })

    it('renders the tagline', () => {
      renderJourney()
      expect(
        screen.getByText(
          (_, element) =>
            element?.tagName === 'P' &&
            /from\s+prayer\s+to\s+community.*every step draws you closer to\s+peace/i.test(
              element.textContent ?? ''
            )
        )
      ).toBeInTheDocument()
    })

    it('renders an ordered list with role="list" and 7 items', () => {
      renderJourney()
      const list = screen.getByRole('list')
      expect(list.tagName).toBe('OL')
      const items = within(list).getAllByRole('listitem')
      expect(items).toHaveLength(7)
    })
  })

  describe('Step Content', () => {
    it('renders numbered circles 1-7', () => {
      renderJourney()
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument()
      }
    })

    it('renders description text for each step', () => {
      renderJourney()
      for (const desc of STEP_DESCRIPTIONS) {
        expect(screen.getByText(desc)).toBeInTheDocument()
      }
    })

    it('each step links to the correct route', () => {
      renderJourney()
      const links = screen.getAllByRole('link')
      const journeyLinks = links.filter((link) =>
        STEP_ROUTES.some((route) => link.getAttribute('href') === route)
      )
      expect(journeyLinks).toHaveLength(7)
      for (let i = 0; i < STEP_ROUTES.length; i++) {
        expect(journeyLinks[i]).toHaveAttribute('href', STEP_ROUTES[i])
      }
    })

    it('step links have hover background class', () => {
      renderJourney()
      const links = screen.getAllByRole('link')
      const journeyLinks = links.filter((link) =>
        STEP_ROUTES.some((route) => link.getAttribute('href') === route)
      )
      for (const link of journeyLinks) {
        expect(link.className).toContain('hover:bg-white/[0.04]')
      }
    })
  })

  describe('Connecting Lines', () => {
    it('connecting line present between circles (not on last)', () => {
      renderJourney()
      const items = within(screen.getByRole('list')).getAllByRole('listitem')
      // First 6 items should have a connecting line div
      for (let i = 0; i < 6; i++) {
        const line = items[i].querySelector('.w-px')
        expect(line).toBeInTheDocument()
      }
      // Last item should NOT have a connecting line
      const lastLine = items[6].querySelector('.w-px')
      expect(lastLine).not.toBeInTheDocument()
    })
  })

  describe('Squiggle Lines', () => {
    it('inline squiggle SVG rendered', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to.*healing/i })
      const svgs = section.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(1)
    })

    it('squiggle SVG is 150px wide and centered', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to.*healing/i })
      const squiggleSvg = section.querySelector('svg[viewBox="0 0 150 1000"]') as SVGElement
      expect(squiggleSvg).toBeInTheDocument()
      expect(squiggleSvg.style.width).toBe('150px')
    })
  })

  describe('Glow Orbs', () => {
    it('renders two glow orbs with radial gradients', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to.*healing/i })
      const glowContainer = section.querySelector('[aria-hidden="true"].pointer-events-none.absolute.inset-0')!
      const orbs = glowContainer.querySelectorAll('.rounded-full')
      expect(orbs).toHaveLength(2)
      expect((orbs[0] as HTMLElement).style.background).toContain('radial-gradient')
      expect((orbs[1] as HTMLElement).style.background).toContain('radial-gradient')
    })

    it('upper orb has 0.25 center opacity with two-stop gradient', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to.*healing/i })
      const glowContainer = section.querySelector('[aria-hidden="true"].pointer-events-none.absolute.inset-0')!
      const orbs = glowContainer.querySelectorAll('.rounded-full')
      const bg = (orbs[0] as HTMLElement).style.background
      expect(bg).toContain('rgba(139, 92, 246, 0.25)')
      expect(bg).toContain('40%')
    })

    it('lower orb has 0.20 center opacity with two-stop gradient', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to.*healing/i })
      const glowContainer = section.querySelector('[aria-hidden="true"].pointer-events-none.absolute.inset-0')!
      const orbs = glowContainer.querySelectorAll('.rounded-full')
      const bg = (orbs[1] as HTMLElement).style.background
      expect(bg).toContain('rgba(139, 92, 246, 0.20)')
      expect(bg).toContain('40%')
    })

    it('both orbs have will-change-transform', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to.*healing/i })
      const glowContainer = section.querySelector('[aria-hidden="true"].pointer-events-none.absolute.inset-0')!
      const orbs = glowContainer.querySelectorAll('.rounded-full')
      expect((orbs[0] as HTMLElement).className).toContain('will-change-transform')
      expect((orbs[1] as HTMLElement).className).toContain('will-change-transform')
    })
  })

  describe('Animation', () => {
    it('steps have 120ms stagger with 200ms initial delay', () => {
      renderJourney()
      const items = within(screen.getByRole('list')).getAllByRole('listitem')
      for (let i = 0; i < items.length; i++) {
        expect(items[i].style.transitionDelay).toBe(`${200 + i * 120}ms`)
      }
    })
  })

  describe('Arrow Icon', () => {
    it('arrow icon present for hover', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to.*healing/i })
      // ArrowRight icons should be present (one per step, aria-hidden)
      const arrows = section.querySelectorAll('svg.h-5.w-5')
      expect(arrows.length).toBeGreaterThanOrEqual(7)
    })
  })

  describe('Accessibility', () => {
    it('all links are keyboard-focusable', () => {
      renderJourney()
      const links = screen.getAllByRole('link')
      const journeyLinks = links.filter((link) =>
        STEP_ROUTES.some((route) => link.getAttribute('href') === route)
      )
      for (const link of journeyLinks) {
        expect(link).not.toHaveAttribute('tabindex', '-1')
      }
    })

    it('numbered circles are aria-hidden', () => {
      renderJourney()
      for (let i = 1; i <= 7; i++) {
        const circle = screen.getByText(String(i)).closest('span')
        expect(circle).toHaveAttribute('aria-hidden', 'true')
      }
    })

    it('links have focus-visible ring classes', () => {
      renderJourney()
      const links = screen.getAllByRole('link')
      const journeyLinks = links.filter((link) =>
        STEP_ROUTES.some((route) => link.getAttribute('href') === route)
      )
      for (const link of journeyLinks) {
        expect(link.className).toContain('focus-visible:ring-2')
      }
    })
  })
})
