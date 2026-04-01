import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { SETTINGS_KEY } from '@/services/settings-storage'
import { Settings } from '../Settings'

const mockLogout = vi.fn()

const { mockAuthFn } = vi.hoisted(() => {
  const mockAuthFn = vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  }))
  return { mockAuthFn }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthFn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthFn(),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

const mockUseAuth = mockAuthFn

function renderSettings() {
  return render(
    <MemoryRouter
      initialEntries={['/settings']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Settings Page', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: mockLogout,
    })
    mockLogout.mockClear()
  })

  // --- Auth & Shell ---

  it('redirects to / when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null as unknown as { name: string; id: string },
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderSettings()
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('renders page when authenticated', () => {
    renderSettings()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('renders SEO component with correct title', () => {
    renderSettings()
    // Title is managed by <SEO title="Settings"> (Helmet is globally mocked in test setup).
    // Title rendering is verified in SEO.test.tsx and Playwright; here we just verify the page renders.
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  // --- Desktop Sidebar ---

  it('desktop: sidebar with 6 nav items', () => {
    renderSettings()
    const nav = screen.getByRole('navigation', { name: 'Settings' })
    const buttons = nav.querySelectorAll('button')
    expect(buttons).toHaveLength(6)
    expect(buttons[0]).toHaveTextContent('Profile')
    expect(buttons[1]).toHaveTextContent('Dashboard')
    expect(buttons[2]).toHaveTextContent('Notifications')
    expect(buttons[3]).toHaveTextContent('Privacy')
    expect(buttons[4]).toHaveTextContent('Account')
    expect(buttons[5]).toHaveTextContent('App')
  })

  it('active sidebar item has highlighted background', () => {
    renderSettings()
    const nav = screen.getByRole('navigation', { name: 'Settings' })
    const profileBtn = nav.querySelector('button')!
    expect(profileBtn.className).toContain('bg-primary/10')
  })

  // --- Mobile Tabs ---

  it('mobile: tab bar with 6 tabs', () => {
    renderSettings()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(6)
  })

  it('active mobile tab has aria-selected true', () => {
    renderSettings()
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  })

  // --- Section Switching ---

  it('clicking nav switches section and renders real components', async () => {
    const user = userEvent.setup()
    renderSettings()

    // Default: profile section renders with Display Name input
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()

    // Switch to Notifications
    const nav = screen.getByRole('navigation', { name: 'Settings' })
    const notifBtn = nav.querySelectorAll('button')[2]
    await user.click(notifBtn)

    // Notifications section rendered
    expect(screen.getAllByRole('switch').length).toBeGreaterThanOrEqual(9)
  })

  it('section switching preserves settings state', async () => {
    const user = userEvent.setup()
    renderSettings()

    // Type a name
    const nameInput = screen.getByLabelText('Display Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'NewName')
    await user.tab()

    // Switch to Privacy
    const nav = screen.getByRole('navigation', { name: 'Settings' })
    await user.click(nav.querySelectorAll('button')[3])

    // Switch back to Profile
    await user.click(nav.querySelectorAll('button')[0])

    // Name should be preserved
    const nameInputAgain = screen.getByLabelText('Display Name') as HTMLInputElement
    expect(nameInputAgain.value).toBe('NewName')
  })

  it('settings persist across page reload (remount)', async () => {
    const user = userEvent.setup()
    const { unmount } = renderSettings()

    // Toggle a notification off
    const nav = screen.getByRole('navigation', { name: 'Settings' })
    await user.click(nav.querySelectorAll('button')[2]) // Notifications
    const switches = screen.getAllByRole('switch')
    const inAppToggle = switches[0]
    await user.click(inAppToggle) // Turn off in-app

    unmount()

    // Remount
    renderSettings()
    const nav2 = screen.getByRole('navigation', { name: 'Settings' })
    await user.click(nav2.querySelectorAll('button')[2])
    const switches2 = screen.getAllByRole('switch')
    expect(switches2[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('corrupted wr_settings recovers gracefully', () => {
    localStorage.setItem(SETTINGS_KEY, 'corrupted{{{')
    renderSettings()
    // Should render without crashing, with defaults
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
  })

  it('cross-tab sync updates displayed values', async () => {
    const user = userEvent.setup()
    renderSettings()

    // Switch to notifications to see toggles
    const nav = screen.getByRole('navigation', { name: 'Settings' })
    await user.click(nav.querySelectorAll('button')[2])

    // Simulate another tab changing settings
    const newSettings = {
      profile: { displayName: 'Other Tab', avatarId: 'default', email: 'user@example.com' },
      notifications: {
        inAppNotifications: false,
        pushNotifications: false,
        emailWeeklyDigest: true,
        emailMonthlyReport: true,
        encouragements: true,
        milestones: true,
        friendRequests: true,
        nudges: true,
        weeklyRecap: true,
      },
      privacy: {
        showOnGlobalLeaderboard: true,
        activityStatus: true,
        nudgePermission: 'friends',
        streakVisibility: 'friends',
        blockedUsers: [],
      },
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: SETTINGS_KEY,
          newValue: JSON.stringify(newSettings),
        }),
      )
    })

    // In-app notifications should now show as OFF (index 1 because Sound Effects toggle is index 0)
    const switches = screen.getAllByRole('switch')
    expect(switches[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('delete account full flow', async () => {
    const user = userEvent.setup()
    localStorage.setItem('wr_settings', '{}')
    localStorage.setItem('wr_friends', '{}')
    localStorage.setItem('wr_mood_entries', '[]')

    renderSettings()

    // Go to Account section
    const nav = screen.getByRole('navigation', { name: 'Settings' })
    await user.click(nav.querySelectorAll('button')[4])

    // Click Delete Account
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    // Confirm delete
    await user.click(screen.getByRole('button', { name: 'Delete Everything' }))

    // All wr_ keys gone
    expect(localStorage.getItem('wr_settings')).toBeNull()
    expect(localStorage.getItem('wr_friends')).toBeNull()
    expect(localStorage.getItem('wr_mood_entries')).toBeNull()

    // Redirected to home
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(mockLogout).toHaveBeenCalled()
  })

  it('content panel has aria-live for section changes', () => {
    renderSettings()
    const panel = document.getElementById('settings-panel-profile')
    expect(panel).toHaveAttribute('aria-live', 'polite')
  })
})
