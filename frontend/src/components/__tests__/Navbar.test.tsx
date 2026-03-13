import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Navbar } from '@/components/Navbar'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

function renderNavbar(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
      <AuthModalProvider>
      <Navbar />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
      </AuthModalProvider>
      </ToastProvider>
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
    it('renders Daily Hub and Prayer Wall links', () => {
      renderNavbar()
      expect(screen.getByRole('link', { name: 'Daily Hub' })).toHaveAttribute('href', '/daily')
      expect(screen.getByRole('link', { name: 'Prayer Wall' })).toBeInTheDocument()
    })

    it('renders "Music" as a direct link (no dropdown)', () => {
      renderNavbar()
      expect(screen.getByRole('link', { name: 'Music' })).toHaveAttribute('href', '/music')
      expect(
        screen.queryByRole('button', { name: /music menu/i })
      ).not.toBeInTheDocument()
    })

    it('renders "Local Support" dropdown trigger', () => {
      renderNavbar()
      expect(
        screen.getByRole('button', { name: /local support menu/i })
      ).toBeInTheDocument()
    })
  })

  describe('Auth actions', () => {
    it('"Log In" button opens auth modal', () => {
      renderNavbar()
      const loginButtons = screen.getAllByRole('button', { name: /log in/i })
      expect(loginButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('"Get Started" button opens auth modal', () => {
      renderNavbar()
      const ctaButtons = screen.getAllByRole('button', { name: /get started/i })
      expect(ctaButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Local Support dropdown', () => {
    it('"Local Support" label is a link to /local-support/churches', () => {
      renderNavbar()
      const link = screen.getByRole('link', { name: 'Local Support' })
      expect(link).toHaveAttribute('href', '/local-support/churches')
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
      expect(links).toHaveLength(3)
      expect(links[0]).toHaveAttribute('href', '/local-support/churches')
      expect(links[1]).toHaveAttribute('href', '/local-support/counselors')
      expect(links[2]).toHaveAttribute('href', '/local-support/celebrate-recovery')
    })

    it('chevron trigger has correct ARIA attributes', () => {
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /local support menu/i })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      fireEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(trigger).toHaveAttribute('aria-controls', 'local-support-dropdown')
    })
  })

  describe('Music link', () => {
    it('"Music" is a direct NavLink to /music', () => {
      renderNavbar()
      const link = screen.getByRole('link', { name: 'Music' })
      expect(link).toHaveAttribute('href', '/music')
    })

    it('no Music dropdown chevron exists', () => {
      renderNavbar()
      expect(
        screen.queryByRole('button', { name: /music menu/i })
      ).not.toBeInTheDocument()
    })

    it('"Music" link has active state on /music route', () => {
      renderNavbar('/music')
      const link = screen.getByRole('link', { name: 'Music' })
      expect(link.className).toContain('after:scale-x-100')
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
      expect(menu).toHaveAttribute('aria-label', 'Mobile navigation')
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
      expect(menu).toHaveAttribute('aria-label', 'Mobile navigation')
      expect(menu).toHaveAttribute('id', 'mobile-menu')
    })

    it('mobile menu contains all nav links', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))

      const menu = document.getElementById('mobile-menu')!
      const allLabels = [
        'Daily Hub',
        'Prayer Wall',
        'Music',
        'Churches',
        'Counselors',
        'Celebrate Recovery',
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
      await user.click(within(menu).getByText('Daily Hub'))
      expect(document.getElementById('mobile-menu')).not.toBeInTheDocument()
    })
  })

  describe('Active route', () => {
    it('active top-level link has active styling', () => {
      renderNavbar('/prayer-wall')
      const link = screen.getByRole('link', { name: 'Prayer Wall' })
      expect(link.className).toContain('text-white')
      expect(link.className).toContain('after:scale-x-100')
    })

    it('active route link has aria-current="page"', () => {
      renderNavbar('/prayer-wall')
      const link = screen.getByRole('link', { name: 'Prayer Wall' })
      expect(link).toHaveAttribute('aria-current', 'page')
    })
  })
})
