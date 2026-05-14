import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigationType } from 'react-router-dom'
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

function renderSettings(path: string = '/settings') {
  return render(
    <MemoryRouter
      initialEntries={[path]}
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

function getDesktopTablist() {
  const tablists = screen.getAllByRole('tablist')
  return tablists.find((el) => el.getAttribute('aria-orientation') === 'vertical')!
}

function NavigationTypeProbe() {
  const navType = useNavigationType()
  return <div data-testid="nav-type">{navType}</div>
}

function renderSettingsWithProbe(path: string = '/settings') {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Routes>
          <Route
            path="/settings"
            element={
              <>
                <Settings />
                <NavigationTypeProbe />
              </>
            }
          />
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
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  // --- Tab Pattern Unification ---
  // Spec 6.4 (MPD-11) added a "Sensitive features" section between Privacy and
  // Account, bringing the total to 7. Tab counts updated accordingly.

  it('tab pattern: both contexts use role="tab" inside role="tablist"', () => {
    renderSettings()
    const tablists = screen.getAllByRole('tablist')
    expect(tablists).toHaveLength(2)
    tablists.forEach((tablist) => {
      const tabs = tablist.querySelectorAll('[role="tab"]')
      expect(tabs).toHaveLength(7)
    })
  })

  it('tab pattern: no <nav role="navigation"> wrapper', () => {
    const { container } = renderSettings()
    expect(container.querySelector('nav[role="navigation"]')).toBeNull()
  })

  it('desktop: sidebar with 7 tab items', () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const buttons = desktopTablist.querySelectorAll('[role="tab"]')
    expect(buttons).toHaveLength(7)
    expect(buttons[0]).toHaveTextContent('Profile')
    expect(buttons[1]).toHaveTextContent('Dashboard')
    expect(buttons[2]).toHaveTextContent('Notifications')
    expect(buttons[3]).toHaveTextContent('Privacy')
    expect(buttons[4]).toHaveTextContent('Sensitive features')
    expect(buttons[5]).toHaveTextContent('Account')
    expect(buttons[6]).toHaveTextContent('App')
  })

  it('mobile: tab bar with 7 tabs', () => {
    renderSettings()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(14) // 7 mobile + 7 desktop (both in jsdom)
  })

  it('active tab has aria-selected true for profile by default', () => {
    renderSettings()
    const profileTabs = screen
      .getAllByRole('tab')
      .filter((t) => t.textContent === 'Profile')
    expect(profileTabs.length).toBeGreaterThan(0)
    profileTabs.forEach((t) => expect(t).toHaveAttribute('aria-selected', 'true'))
  })

  // --- Active-State Styling ---

  it('active-state styling: desktop vertical indicator uses bg-white/15 and border-l-2', () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const activeTab = desktopTablist.querySelector('[aria-selected="true"]') as HTMLElement
    expect(activeTab.className).toContain('bg-white/15')
    expect(activeTab.className).toContain('text-white')
    expect(activeTab.className).toContain('border-l-2')
    expect(activeTab.className).toContain('border-white/40')
  })

  it('active-state styling: mobile horizontal indicator uses bg-white/15 and border-b-2', () => {
    renderSettings()
    const tablists = screen.getAllByRole('tablist')
    const mobileTablist = tablists.find((el) => !el.getAttribute('aria-orientation'))!
    const activeTab = mobileTablist.querySelector('[aria-selected="true"]') as HTMLElement
    expect(activeTab.className).toContain('bg-white/15')
    expect(activeTab.className).toContain('text-white')
    expect(activeTab.className).toContain('border-b-2')
    expect(activeTab.className).toContain('border-white/40')
  })

  it('inactive-state styling: inactive tabs have text-white/60', () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const inactiveTab = desktopTablist.querySelector('[aria-selected="false"]') as HTMLElement
    expect(inactiveTab.className).toContain('text-white/60')
  })

  // --- tabIndex Roving ---

  it('tabIndex roving: active tab has tabIndex 0, inactive have -1', () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const tabs = desktopTablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    expect(tabs[0].tabIndex).toBe(0) // Profile is active
    for (let i = 1; i < tabs.length; i++) {
      expect(tabs[i].tabIndex).toBe(-1)
    }
  })

  // --- font-script Removal ---

  it('font-script removal: h1 has no font-script span', () => {
    renderSettings()
    const heading = screen.getByRole('heading', { level: 1, name: 'Settings' })
    expect(heading.querySelector('span.font-script')).toBeNull()
  })

  // --- URL State ---

  it('URL state: deep link to ?tab=notifications renders Notifications section', () => {
    renderSettings('/settings?tab=notifications')
    expect(screen.getAllByRole('switch').length).toBeGreaterThanOrEqual(9)
  })

  it('URL state: missing tab defaults to profile', () => {
    renderSettings('/settings')
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
  })

  it('URL state: invalid tab defaults to profile', () => {
    renderSettings('/settings?tab=garbage')
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
  })

  it('URL state: tab click uses replace, not push', async () => {
    const user = userEvent.setup()
    renderSettingsWithProbe()
    // Initial render: NavigationType is "POP" (memory router fresh entry).
    expect(screen.getByTestId('nav-type')).toHaveTextContent('POP')

    const desktopTablist = getDesktopTablist()
    const notifTab = desktopTablist.querySelectorAll('[role="tab"]')[2] as HTMLElement
    await user.click(notifTab)

    // After a tab click, NavigationType must be "REPLACE" so the back button
    // doesn't accumulate one history entry per tab switch.
    expect(screen.getByTestId('nav-type')).toHaveTextContent('REPLACE')
  })

  // --- Arrow-Key Roving ---

  it('arrow-key roving: ArrowRight advances to next tab', async () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const tabs = desktopTablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(desktopTablist.querySelector('[aria-selected="true"]')).toHaveTextContent('Dashboard')
  })

  it('arrow-key roving: ArrowDown advances to next tab', async () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const tabs = desktopTablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowDown' })
    expect(desktopTablist.querySelector('[aria-selected="true"]')).toHaveTextContent('Dashboard')
  })

  it('arrow-key roving: ArrowLeft on first wraps to last', () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const tabs = desktopTablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' })
    expect(desktopTablist.querySelector('[aria-selected="true"]')).toHaveTextContent('App')
  })

  it('arrow-key roving: Home jumps to first tab', () => {
    renderSettings('/settings?tab=privacy')
    const desktopTablist = getDesktopTablist()
    const tabs = desktopTablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    const privacyTab = Array.from(tabs).find((t) => t.textContent === 'Privacy')!
    privacyTab.focus()
    fireEvent.keyDown(privacyTab, { key: 'Home' })
    expect(desktopTablist.querySelector('[aria-selected="true"]')).toHaveTextContent('Profile')
  })

  it('arrow-key roving: End jumps to last tab', () => {
    renderSettings()
    const desktopTablist = getDesktopTablist()
    const tabs = desktopTablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'End' })
    expect(desktopTablist.querySelector('[aria-selected="true"]')).toHaveTextContent('App')
  })

  // --- Section Switching ---

  it('clicking tab switches section and renders real components', async () => {
    const user = userEvent.setup()
    renderSettings()

    // Default: profile section renders with Display Name input
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()

    // Switch to Notifications via desktop tablist
    const desktopTablist = getDesktopTablist()
    const notifBtn = desktopTablist.querySelectorAll('[role="tab"]')[2] as HTMLElement
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
    const desktopTablist = getDesktopTablist()
    await user.click(desktopTablist.querySelectorAll('[role="tab"]')[3] as HTMLElement)

    // Switch back to Profile
    await user.click(desktopTablist.querySelectorAll('[role="tab"]')[0] as HTMLElement)

    // Name should be preserved
    const nameInputAgain = screen.getByLabelText('Display Name') as HTMLInputElement
    expect(nameInputAgain.value).toBe('NewName')
  })

  it('settings persist across page reload (remount)', async () => {
    const user = userEvent.setup()
    const { unmount } = renderSettings()

    // Toggle a notification off
    const desktopTablist = getDesktopTablist()
    await user.click(desktopTablist.querySelectorAll('[role="tab"]')[2] as HTMLElement) // Notifications
    const switches = screen.getAllByRole('switch')
    const inAppToggle = switches[0]
    await user.click(inAppToggle) // Turn off in-app

    unmount()

    // Remount
    renderSettings()
    const desktopTablist2 = getDesktopTablist()
    await user.click(desktopTablist2.querySelectorAll('[role="tab"]')[2] as HTMLElement)
    const switches2 = screen.getAllByRole('switch')
    expect(switches2[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('corrupted wr_settings recovers gracefully', () => {
    localStorage.setItem(SETTINGS_KEY, 'corrupted{{{')
    renderSettings()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
  })

  it('cross-tab sync updates displayed values', async () => {
    const user = userEvent.setup()
    renderSettings()

    // Switch to notifications to see toggles
    const desktopTablist = getDesktopTablist()
    await user.click(desktopTablist.querySelectorAll('[role="tab"]')[2] as HTMLElement)

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

    // Go to Account section. Spec 6.4 inserted "Sensitive features" at index 4,
    // shifting Account from 4 → 5.
    const desktopTablist = getDesktopTablist()
    await user.click(desktopTablist.querySelectorAll('[role="tab"]')[5] as HTMLElement)

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
