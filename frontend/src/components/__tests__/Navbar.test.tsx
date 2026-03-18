import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navbar } from '@/components/Navbar'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockLogout = vi.fn()

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })
  mockLogout.mockClear()
})

function setLoggedIn() {
  mockUseAuth.mockReturnValue({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: mockLogout,
  })
}

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

  describe('Logged-in desktop state', () => {
    it('hides Log In and Get Started when logged in', () => {
      setLoggedIn()
      renderNavbar()
      expect(screen.queryByText('Log In')).not.toBeInTheDocument()
      expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
    })

    it('shows notification bell when logged in', () => {
      setLoggedIn()
      renderNavbar()
      expect(screen.getByLabelText(/^Notifications/)).toBeInTheDocument()
    })

    it('bell not visible when logged out', () => {
      renderNavbar()
      expect(screen.queryByLabelText(/^Notifications/)).not.toBeInTheDocument()
    })

    it('shows avatar with initial when logged in', () => {
      setLoggedIn()
      renderNavbar()
      const avatar = screen.getByLabelText('User menu')
      expect(avatar).toBeInTheDocument()
      expect(avatar.textContent).toBe('E')
    })

    it('avatar not visible when logged out', () => {
      renderNavbar()
      expect(screen.queryByLabelText('User menu')).not.toBeInTheDocument()
    })

    it('avatar dropdown opens on click', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByLabelText('User menu'))
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('avatar dropdown has all menu items', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByLabelText('User menu'))

      const menu = screen.getByRole('menu')
      expect(within(menu).getByText('Dashboard')).toBeInTheDocument()
      expect(within(menu).getByText('Friends')).toBeInTheDocument()
      expect(within(menu).getByText('My Journal Entries')).toBeInTheDocument()
      expect(within(menu).getByText('My Prayer Requests')).toBeInTheDocument()
      expect(within(menu).getByText('My Favorites')).toBeInTheDocument()
      expect(within(menu).getByText('Mood Insights')).toBeInTheDocument()
      expect(within(menu).getByText('Settings')).toBeInTheDocument()
      expect(within(menu).getByText('Log Out')).toBeInTheDocument()
    })

    it('dropdown closes on outside click', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByLabelText('User menu'))
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.click(document.body)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('dropdown closes on Escape', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByLabelText('User menu'))
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('Log Out calls logout', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByLabelText('User menu'))
      await user.click(within(screen.getByRole('menu')).getByText('Log Out'))
      expect(mockLogout).toHaveBeenCalled()
    })

    it('avatar dropdown has aria-haspopup', () => {
      setLoggedIn()
      renderNavbar()
      const avatar = screen.getByLabelText('User menu')
      expect(avatar).toHaveAttribute('aria-haspopup', 'menu')
    })
  })

  describe('Logged-in mobile drawer', () => {
    it('shows avatar and name when logged in', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      const menu = document.getElementById('mobile-menu')!
      expect(within(menu).getByText('Eric')).toBeInTheDocument()
    })

    it('shows logged-in nav items', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      const menu = document.getElementById('mobile-menu')!
      expect(within(menu).getByText('Dashboard')).toBeInTheDocument()
      expect(within(menu).getByText('Friends')).toBeInTheDocument()
      expect(within(menu).getByText('Settings')).toBeInTheDocument()
    })

    it('shows Notifications item when logged in', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      const menu = document.getElementById('mobile-menu')!
      expect(within(menu).getByText('Notifications')).toBeInTheDocument()
    })

    it('shows Log Out when logged in', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      const menu = document.getElementById('mobile-menu')!
      expect(within(menu).getByText('Log Out')).toBeInTheDocument()
    })

    it('shows Log In / Get Started when logged out', async () => {
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      const menu = document.getElementById('mobile-menu')!
      expect(within(menu).getByText('Log In')).toBeInTheDocument()
      expect(within(menu).getByText('Get Started')).toBeInTheDocument()
    })

    it('shows Mood Insights after Friends in nav order', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      const menu = document.getElementById('mobile-menu')!
      const links = within(menu).getAllByRole('link')
      const labels = links.map((l) => l.textContent)
      const friendsIdx = labels.indexOf('Friends')
      const insightsIdx = labels.indexOf('Mood Insights')
      expect(friendsIdx).toBeGreaterThan(-1)
      expect(insightsIdx).toBe(friendsIdx + 1)
    })

    it('uses dark theme when logged in', async () => {
      setLoggedIn()
      const user = userEvent.setup()
      renderNavbar()

      await user.click(screen.getByRole('button', { name: 'Open menu' }))
      const menu = document.getElementById('mobile-menu')!
      expect(menu.className).toContain('bg-hero-mid')
      expect(menu.className).toContain('border-white/15')
    })
  })
})
