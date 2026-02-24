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
    it('renders 2 top-level nav links', () => {
      renderNavbar()
      const links = ['Music', 'Prayer Wall']
      for (const label of links) {
        expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
      }
    })

    it('renders "Daily" and "Local Support" dropdown triggers', () => {
      renderNavbar()
      expect(
        screen.getByRole('button', { name: /daily menu/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /local support menu/i })
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

  describe('Daily dropdown', () => {
    it('"Daily" label is a link to /daily', () => {
      renderNavbar()
      const link = screen.getByRole('link', { name: 'Daily' })
      expect(link).toHaveAttribute('href', '/daily')
    })

    it('dropdown is closed by default', () => {
      renderNavbar()
      expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
    })

    it('clicking the chevron opens the dropdown', () => {
      renderNavbar()
      fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
      expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
    })

    it('clicking the chevron again closes the dropdown', () => {
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /daily menu/i })
      fireEvent.click(trigger)
      expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
      fireEvent.click(trigger)
      expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
    })

    it('dropdown links point to correct routes', () => {
      renderNavbar()
      fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
      const dropdown = document.getElementById('daily-dropdown')!
      const links = within(dropdown).getAllByRole('link')
      expect(links).toHaveLength(4)
      expect(links[0]).toHaveAttribute('href', '/scripture')
      expect(links[1]).toHaveAttribute('href', '/journal')
      expect(links[2]).toHaveAttribute('href', '/meditate')
      expect(links[3]).toHaveAttribute('href', '/daily')
    })

    it('Escape key closes the dropdown', async () => {
      const user = userEvent.setup()
      renderNavbar()
      fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
      expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
    })

    it('Escape key returns focus to the chevron trigger', async () => {
      const user = userEvent.setup()
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /daily menu/i })
      fireEvent.click(trigger)
      await user.keyboard('{Escape}')
      expect(document.activeElement).toBe(trigger)
    })

    it('outside click closes the dropdown', () => {
      renderNavbar()
      fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
      expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
      fireEvent.mouseDown(screen.getByLabelText('Main navigation'))
      expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
    })

    it('chevron trigger has aria-haspopup="true" and correct aria-expanded', () => {
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /daily menu/i })
      expect(trigger).toHaveAttribute('aria-haspopup', 'true')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('aria-controls is only set when dropdown is open', () => {
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /daily menu/i })
      expect(trigger).not.toHaveAttribute('aria-controls')
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-controls', 'daily-dropdown')
    })

    it('dropdown panel uses ul/li with no ARIA role override', () => {
      renderNavbar()
      fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
      const dropdown = document.getElementById('daily-dropdown')!
      expect(dropdown.tagName).toBe('UL')
      expect(dropdown).not.toHaveAttribute('role')
      const links = within(dropdown).getAllByRole('link')
      expect(links).toHaveLength(4)
    })

    it('hovering over the wrapper opens the dropdown', async () => {
      const user = userEvent.setup()
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /daily menu/i })
      const wrapper = trigger.closest('.relative')!
      await user.hover(wrapper)
      expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
    })

    it('unhovering the wrapper closes the dropdown after delay', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      try {
        renderNavbar()
        const trigger = screen.getByRole('button', { name: /daily menu/i })
        const wrapper = trigger.closest('.relative')!
        await user.hover(wrapper)
        expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
        await user.unhover(wrapper)
        expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
        act(() => {
          vi.advanceTimersByTime(200)
        })
        expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('Local Support dropdown', () => {
    it('"Local Support" label is a link to /churches', () => {
      renderNavbar()
      const link = screen.getByRole('link', { name: 'Local Support' })
      expect(link).toHaveAttribute('href', '/churches')
    })

    it('dropdown is closed by default', () => {
      renderNavbar()
      expect(document.getElementById('local-support-dropdown')).not.toBeInTheDocument()
    })

    it('clicking the chevron opens the dropdown', () => {
      renderNavbar()
      fireEvent.click(screen.getByRole('button', { name: /local support menu/i }))
      expect(document.getElementById('local-support-dropdown')).toBeInTheDocument()
    })

    it('clicking the chevron again closes the dropdown', () => {
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /local support menu/i })
      fireEvent.click(trigger)
      expect(document.getElementById('local-support-dropdown')).toBeInTheDocument()
      fireEvent.click(trigger)
      expect(document.getElementById('local-support-dropdown')).not.toBeInTheDocument()
    })

    it('dropdown links point to correct routes', () => {
      renderNavbar()
      fireEvent.click(screen.getByRole('button', { name: /local support menu/i }))
      const dropdown = document.getElementById('local-support-dropdown')!
      const links = within(dropdown).getAllByRole('link')
      expect(links).toHaveLength(2)
      expect(links[0]).toHaveAttribute('href', '/churches')
      expect(links[1]).toHaveAttribute('href', '/counselors')
    })

    it('chevron trigger has correct ARIA attributes', () => {
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /local support menu/i })
      expect(trigger).toHaveAttribute('aria-haspopup', 'true')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(trigger).toHaveAttribute('aria-controls', 'local-support-dropdown')
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

    it('mobile menu contains all nav links', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))

      const menu = document.getElementById('mobile-menu')!
      const allLabels = [
        'Pray',
        'Journal',
        'Meditate',
        'Verse & Song',
        'Music',
        'Prayer Wall',
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
    it('active top-level link has active styling', () => {
      renderNavbar('/music')
      const musicLink = screen.getByRole('link', { name: 'Music' })
      expect(musicLink.className).toContain('text-primary')
      expect(musicLink.className).toContain('after:scale-x-100')
    })

    it('active route link has aria-current="page"', () => {
      renderNavbar('/music')
      const musicLink = screen.getByRole('link', { name: 'Music' })
      expect(musicLink).toHaveAttribute('aria-current', 'page')
    })
  })
})
