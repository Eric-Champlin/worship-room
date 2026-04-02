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

const STEP_PREFIXES = [
  'Read a',
  'Learn to',
  'Learn to',
  'Learn to',
  'Listen to',
  'Write on the',
  'Find',
]

const STEP_KEYWORDS = [
  'Devotional',
  'Pray',
  'Journal',
  'Meditate',
  'Music',
  'Prayer Wall',
  'Local Support',
]

const STEP_ROUTES = [
  '/daily?tab=devotional',
  '/daily?tab=pray',
  '/daily?tab=journal',
  '/daily?tab=meditate',
  '/music',
  '/prayer-wall',
  '/local-support/churches',
]

describe('JourneySection', () => {
  describe('Structure & Semantics', () => {
    it('renders as a named section landmark', () => {
      renderJourney()
      expect(
        screen.getByRole('region', { name: /your journey to healing/i })
      ).toBeInTheDocument()
    })

    it('renders an h2 heading via SectionHeading', () => {
      renderJourney()
      const heading = screen.getByRole('heading', {
        level: 2,
        name: /your journey to healing/i,
      })
      expect(heading).toBeInTheDocument()
      expect(heading.style.backgroundImage).toContain('linear-gradient')
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

    it('steps container uses flex-wrap and justify-center', () => {
      renderJourney()
      const list = screen.getByRole('list')
      expect(list.className).toContain('flex-wrap')
      expect(list.className).toContain('justify-center')
    })
  })

  describe('Step Content', () => {
    it('renders numbered circles 1-7', () => {
      renderJourney()
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument()
      }
    })

    it('renders prefix text for each step', () => {
      renderJourney()
      for (const prefix of STEP_PREFIXES) {
        expect(
          screen.getAllByText(prefix).length
        ).toBeGreaterThanOrEqual(1)
      }
    })

    it('renders keyword text for each step', () => {
      renderJourney()
      for (const keyword of STEP_KEYWORDS) {
        expect(screen.getByText(keyword)).toBeInTheDocument()
      }
    })

    it('does not render description text', () => {
      renderJourney()
      expect(screen.queryByText(/start each morning/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/begin with what.s on your heart/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/quiet your mind/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/you.re not alone/i)).not.toBeInTheDocument()
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

    it('step links have consistent width class', () => {
      renderJourney()
      const links = screen.getAllByRole('link')
      const journeyLinks = links.filter((link) =>
        STEP_ROUTES.some((route) => link.getAttribute('href') === route)
      )
      for (const link of journeyLinks) {
        expect(link.className).toContain('w-[100px]')
      }
    })
  })

  describe('Accessibility', () => {
    it('all links are keyboard-focusable (no negative tabindex)', () => {
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

    it('does not render BackgroundSquiggle', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to healing/i })
      // BackgroundSquiggle renders an SVG with a <pattern> element
      const patterns = section.querySelectorAll('pattern')
      expect(patterns).toHaveLength(0)
    })
  })

  describe('Glow Orbs', () => {
    it('glow orbs container is pointer-events-none', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to healing/i })
      const glowContainer = section.querySelector('.pointer-events-none.absolute.inset-0.overflow-hidden')
      expect(glowContainer).toBeInTheDocument()
    })

    it('renders two glow orbs with radial gradients', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to healing/i })
      const orbs = section.querySelectorAll('.blur-\\[80px\\]')
      expect(orbs).toHaveLength(2)
      expect((orbs[0] as HTMLElement).style.background).toContain('radial-gradient')
      expect((orbs[1] as HTMLElement).style.background).toContain('radial-gradient')
    })
  })

  describe('Animation', () => {
    it('steps have 80ms stagger with 200ms initial delay', () => {
      renderJourney()
      const items = within(screen.getByRole('list')).getAllByRole('listitem')
      for (let i = 0; i < items.length; i++) {
        expect(items[i].style.transitionDelay).toBe(`${200 + i * 80}ms`)
      }
    })
  })
})
