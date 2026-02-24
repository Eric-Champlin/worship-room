import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { JourneySection } from '@/components/JourneySection'

function renderJourney() {
  return render(
    <MemoryRouter>
      <JourneySection />
    </MemoryRouter>
  )
}

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

    it('renders the subtitle text', () => {
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

    it('renders an ordered list with 8 items', () => {
      renderJourney()
      const list = screen.getByRole('list')
      const items = within(list).getAllByRole('listitem')
      expect(items).toHaveLength(8)
    })
  })

  describe('Step Content', () => {
    it('renders all 8 step title headings', () => {
      renderJourney()
      const titles = [
        'Pray',
        'Journal',
        'Meditate',
        'Listen',
        'Music',
        'Reflect',
        'Prayer Wall',
        'Local Support',
      ]
      for (const title of titles) {
        expect(
          screen.getByRole('heading', { level: 3, name: title })
        ).toBeInTheDocument()
      }
    })

    it('renders numbered circles 1-8', () => {
      renderJourney()
      for (let i = 1; i <= 8; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument()
      }
    })

    it('renders a description for each step', () => {
      renderJourney()
      expect(
        screen.getByText(/begin with what.s on your heart/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/put your thoughts into words/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/quiet your mind/i)).toBeInTheDocument()
      expect(
        screen.getByText(/hear god.s word spoken over you/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/let music carry you deeper/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/see how far you.ve come/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/you.re not alone/i)).toBeInTheDocument()
      expect(
        screen.getByText(/find churches and christian counselors/i)
      ).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('each step links to its correct route', () => {
      renderJourney()
      const expectedRoutes = [
        '/scripture',
        '/journal',
        '/meditate',
        '/listen',
        '/music',
        '/insights',
        '/prayer-wall',
        '/churches',
      ]
      const links = screen.getAllByRole('link')
      const hrefs = links.map((link) => link.getAttribute('href'))
      for (const route of expectedRoutes) {
        expect(hrefs).toContain(route)
      }
    })

    it('all 8 links are keyboard-focusable', () => {
      renderJourney()
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(8)
      for (const link of links) {
        expect(link).not.toHaveAttribute('tabindex', '-1')
      }
    })
  })

  describe('Accessibility', () => {
    it('numbered circles are hidden from screen readers', () => {
      renderJourney()
      const circles = screen.getAllByText(/^[1-8]$/)
      for (const circle of circles) {
        expect(circle).toHaveAttribute('aria-hidden', 'true')
      }
    })

    it('links have focus-visible ring classes', () => {
      renderJourney()
      const links = screen.getAllByRole('link')
      for (const link of links) {
        expect(link.className).toContain('focus-visible:ring-2')
      }
    })

    it('ordered list has explicit role="list"', () => {
      renderJourney()
      const list = screen.getByRole('list')
      expect(list.tagName).toBe('OL')
      expect(list).toHaveAttribute('role', 'list')
    })
  })

  describe('Animation State', () => {
    it('steps are visible when IntersectionObserver triggers', () => {
      renderJourney()
      const items = screen.getAllByRole('listitem')
      for (const item of items) {
        expect(item.className).toContain('opacity-100')
        expect(item.className).toContain('translate-y-0')
      }
    })

    it('steps have staggered transition delays', () => {
      renderJourney()
      const items = screen.getAllByRole('listitem')
      items.forEach((item, index) => {
        expect(item.style.transitionDelay).toBe(`${index * 120}ms`)
      })
    })
  })
})
