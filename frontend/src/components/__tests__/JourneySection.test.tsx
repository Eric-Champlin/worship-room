import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { JourneySection } from '@/components/JourneySection'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (index: number, base: number) => ({
    transitionDelay: `${index * base}ms`,
  }),
}))

function renderJourney() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <JourneySection />
    </MemoryRouter>
  )
}

const STEP_TITLES = [
  'Read a Devotional',
  'Learn to Pray',
  'Learn to Journal',
  'Learn to Meditate',
  'Listen to Music',
  'Write on the Prayer Wall',
  'Find Local Support',
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

    it('renders an h2 heading', () => {
      renderJourney()
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /your journey to healing/i,
        })
      ).toBeInTheDocument()
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
    it('renders all 7 step title headings', () => {
      renderJourney()
      for (const title of STEP_TITLES) {
        expect(
          screen.getByRole('heading', { level: 3, name: title })
        ).toBeInTheDocument()
      }
    })

    it('renders numbered circles 1-7', () => {
      renderJourney()
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument()
      }
    })

    it('renders description snippets for steps', () => {
      renderJourney()
      expect(screen.getByText(/start each morning/i)).toBeInTheDocument()
      expect(screen.getByText(/begin with what.s on your heart/i)).toBeInTheDocument()
      expect(screen.getByText(/quiet your mind/i)).toBeInTheDocument()
      expect(screen.getByText(/you.re not alone/i)).toBeInTheDocument()
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

    it('arrow icons are aria-hidden', () => {
      renderJourney()
      const section = screen.getByRole('region', { name: /your journey to healing/i })
      const svgs = section.querySelectorAll('svg.lucide-arrow-right')
      expect(svgs).toHaveLength(7)
      for (const svg of svgs) {
        expect(svg).toHaveAttribute('aria-hidden', 'true')
      }
    })
  })

  describe('Animation', () => {
    it('steps have staggered transition delays', () => {
      renderJourney()
      const items = within(screen.getByRole('list')).getAllByRole('listitem')
      for (let i = 0; i < items.length; i++) {
        expect(items[i].style.transitionDelay).toBe(`${i * 120}ms`)
      }
    })
  })
})
