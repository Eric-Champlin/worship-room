import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Navbar } from '@/components/Navbar'

function renderNavbar(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Navbar />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  describe('Logo', () => {
    it('renders logo with "Worship Room" text', () => {
      renderNavbar()
      expect(screen.getByLabelText('Worship Room home')).toBeInTheDocument()
      expect(screen.getByText('Worship Room')).toBeInTheDocument()
    })
  })

  describe('Desktop nav links', () => {
    it('renders 4 top-level nav links', () => {
      renderNavbar()
      const links = ['Pray', 'Journal', 'Meditate', 'Listen']
      for (const label of links) {
        expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
      }
    })

    it('renders "Explore" dropdown trigger', () => {
      renderNavbar()
      expect(
        screen.getByRole('button', { name: /explore/i })
      ).toBeInTheDocument()
    })
  })

  describe('Auth actions', () => {
    it('"Log In" link points to /login', () => {
      renderNavbar()
      const loginLinks = screen.getAllByRole('link', { name: /log in/i })
      const desktopLogin = loginLinks.find(
        (el) => el.getAttribute('href') === '/login'
      )
      expect(desktopLogin).toBeDefined()
    })

    it('"Get Started" button points to /register', () => {
      renderNavbar()
      const ctaLinks = screen.getAllByRole('link', { name: /get started/i })
      const desktopCta = ctaLinks.find(
        (el) => el.getAttribute('href') === '/register'
      )
      expect(desktopCta).toBeDefined()
    })
  })

  describe('Explore dropdown', () => {
    it('dropdown is closed by default', () => {
      renderNavbar()
      expect(screen.queryByText('Music')).not.toBeInTheDocument()
    })

    it('clicking the trigger opens the dropdown', () => {
      renderNavbar()

      const trigger = screen.getByRole('button', { name: /explore/i })
      fireEvent.click(trigger)

      expect(screen.getByText('Music')).toBeInTheDocument()
      expect(screen.getByText('Churches')).toBeInTheDocument()
    })

    it('clicking the trigger again closes the dropdown', () => {
      renderNavbar()

      const trigger = screen.getByRole('button', { name: /explore/i })
      fireEvent.click(trigger)
      expect(screen.getByText('Music')).toBeInTheDocument()

      fireEvent.click(trigger)
      expect(screen.queryByText('Music')).not.toBeInTheDocument()
    })

    it('dropdown links point to correct routes', () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /explore/i }))

      const dropdown = document.getElementById('explore-dropdown')!
      const links = within(dropdown).getAllByRole('link')

      expect(links).toHaveLength(6)
      expect(links[0]).toHaveAttribute('href', '/music')
      expect(links[1]).toHaveAttribute('href', '/prayer-wall')
      expect(links[2]).toHaveAttribute('href', '/insights')
      expect(links[3]).toHaveAttribute('href', '/daily')
      expect(links[4]).toHaveAttribute('href', '/churches')
      expect(links[5]).toHaveAttribute('href', '/counselors')
    })

    it('Escape key closes the dropdown', async () => {
      const user = userEvent.setup()
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /explore/i }))
      expect(screen.getByText('Music')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByText('Music')).not.toBeInTheDocument()
    })

    it('Escape key returns focus to the trigger', async () => {
      const user = userEvent.setup()
      renderNavbar()

      const trigger = screen.getByRole('button', { name: /explore/i })
      fireEvent.click(trigger)
      expect(screen.getByText('Music')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(document.activeElement).toBe(trigger)
    })

    it('outside click closes the dropdown', () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /explore/i }))
      expect(screen.getByText('Music')).toBeInTheDocument()

      fireEvent.mouseDown(screen.getByLabelText('Main navigation'))
      expect(screen.queryByText('Music')).not.toBeInTheDocument()
    })

    it('trigger has aria-haspopup="menu" and correct aria-expanded', () => {
      renderNavbar()

      const trigger = screen.getByRole('button', { name: /explore/i })
      expect(trigger).toHaveAttribute('aria-haspopup', 'true')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('aria-controls is only set when dropdown is open', () => {
      renderNavbar()

      const trigger = screen.getByRole('button', { name: /explore/i })
      expect(trigger).not.toHaveAttribute('aria-controls')

      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-controls', 'explore-dropdown')
    })

    it('dropdown panel uses ul/li with no ARIA role override', () => {
      renderNavbar()

      fireEvent.click(screen.getByRole('button', { name: /explore/i }))

      const dropdown = document.getElementById('explore-dropdown')!
      expect(dropdown.tagName).toBe('UL')
      expect(dropdown).not.toHaveAttribute('role')

      const links = within(dropdown).getAllByRole('link')
      expect(links).toHaveLength(6)
    })

    it('hovering over the wrapper opens the dropdown', async () => {
      const user = userEvent.setup()
      renderNavbar()

      const trigger = screen.getByRole('button', { name: /explore/i })
      const wrapper = trigger.closest('.relative')!
      await user.hover(wrapper)

      expect(screen.getByText('Music')).toBeInTheDocument()
    })

    it('unhovering the wrapper closes the dropdown after delay', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      try {
        renderNavbar()

        const trigger = screen.getByRole('button', { name: /explore/i })
        const wrapper = trigger.closest('.relative')!

        await user.hover(wrapper)
        expect(screen.getByText('Music')).toBeInTheDocument()

        await user.unhover(wrapper)
        // Still open immediately (150ms delay)
        expect(screen.getByText('Music')).toBeInTheDocument()

        // Advance past delay
        act(() => {
          vi.advanceTimersByTime(200)
        })
        expect(screen.queryByText('Music')).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('Hamburger menu', () => {
    it('hamburger button exists with correct aria-label', () => {
      renderNavbar()
      expect(
        screen.getByRole('button', { name: 'Open menu' })
      ).toBeInTheDocument()
    })

    it('clicking hamburger opens mobile menu', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))

      const menu = document.getElementById('mobile-menu')!
      expect(menu).toBeInTheDocument()
      expect(menu).toHaveAttribute('aria-label', 'Navigation menu')
    })

    it('clicking X closes mobile menu', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(document.getElementById('mobile-menu')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Close menu' }))
      expect(document.getElementById('mobile-menu')).not.toBeInTheDocument()
    })

    it('Escape closes mobile menu', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(document.getElementById('mobile-menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(document.getElementById('mobile-menu')).not.toBeInTheDocument()
    })

    it('Escape returns focus to hamburger button', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(document.getElementById('mobile-menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      const hamburger = screen.getByRole('button', { name: 'Open menu' })
      expect(document.activeElement).toBe(hamburger)
    })

    it('aria-expanded reflects open state on hamburger', async () => {
      const user = userEvent.setup()
      renderNavbar()

      const button = screen.getByRole('button', { name: 'Open menu' })
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      const closeButton = screen.getByRole('button', { name: 'Close menu' })
      expect(closeButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('aria-controls is only set when menu is open', async () => {
      const user = userEvent.setup()
      renderNavbar()

      const button = screen.getByRole('button', { name: 'Open menu' })
      expect(button).not.toHaveAttribute('aria-controls')

      await user.click(button)
      const closeButton = screen.getByRole('button', { name: 'Close menu' })
      expect(closeButton).toHaveAttribute('aria-controls', 'mobile-menu')
    })

    it('mobile menu has correct ARIA attributes', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))

      const menu = document.getElementById('mobile-menu')!
      expect(menu).toHaveAttribute('aria-label', 'Navigation menu')
      expect(menu).toHaveAttribute('id', 'mobile-menu')
    })

    it('mobile menu contains all nav links and connect links', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))

      const menu = document.getElementById('mobile-menu')!
      const allLabels = [
        'Pray',
        'Journal',
        'Meditate',
        'Listen',
        'Music',
        'Prayer Wall',
        'Reflect',
        'Daily Verse & Song',
        'Churches',
        'Counselors',
      ]
      for (const label of allLabels) {
        expect(within(menu).getByText(label)).toBeInTheDocument()
      }
    })

    it('route change closes mobile menu', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(document.getElementById('mobile-menu')).toBeInTheDocument()

      // Click a nav link inside the drawer to trigger route change
      const menu = document.getElementById('mobile-menu')!
      await user.click(within(menu).getByText('Pray'))
      expect(document.getElementById('mobile-menu')).not.toBeInTheDocument()
    })
  })

  describe('Active route', () => {
    it('active route link has active styling', () => {
      renderNavbar('/scripture')
      const prayLink = screen.getByRole('link', { name: 'Pray' })
      expect(prayLink.className).toContain('text-primary')
      expect(prayLink.className).toContain('after:scale-x-100')
    })

    it('active route link has aria-current="page"', () => {
      renderNavbar('/scripture')
      const prayLink = screen.getByRole('link', { name: 'Pray' })
      expect(prayLink).toHaveAttribute('aria-current', 'page')
    })
  })
})
