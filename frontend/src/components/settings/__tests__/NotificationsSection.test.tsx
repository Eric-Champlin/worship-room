import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationsSection } from '../NotificationsSection'
import { ToastProvider } from '@/components/ui/Toast'
import { DEFAULT_SETTINGS } from '@/services/settings-storage'

// Mock notification modules
vi.mock('@/lib/notifications/permissions', () => ({
  getPushSupportStatus: vi.fn(() => 'supported'),
  getPermissionState: vi.fn(() => 'default'),
  requestPermission: vi.fn(() => Promise.resolve('granted')),
}))

vi.mock('@/lib/notifications/subscription', () => ({
  subscribeToPush: vi.fn(() => Promise.resolve(null)),
  unsubscribeFromPush: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/notifications/scheduler', () => ({
  fireTestNotification: vi.fn(() => Promise.resolve(true)),
}))

import { getPushSupportStatus, getPermissionState, requestPermission } from '@/lib/notifications/permissions'
import { fireTestNotification } from '@/lib/notifications/scheduler'

const defaultNotifications = { ...DEFAULT_SETTINGS.notifications }

function renderNotifications(
  props: Partial<Parameters<typeof NotificationsSection>[0]> = {},
) {
  const onUpdateNotifications = props.onUpdateNotifications ?? vi.fn()
  const result = render(
    <ToastProvider>
      <NotificationsSection
        notifications={props.notifications ?? defaultNotifications}
        onUpdateNotifications={onUpdateNotifications}
      />
    </ToastProvider>,
  )
  return { ...result, onUpdateNotifications }
}

describe('NotificationsSection', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(getPushSupportStatus).mockReturnValue('supported')
    vi.mocked(getPermissionState).mockReturnValue('default')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- Section headers ---
  it('renders all section headers', () => {
    renderNotifications()
    expect(screen.getByText('Sound')).toBeInTheDocument()
    expect(screen.getByText('Push Notifications')).toBeInTheDocument()
    expect(screen.getByText('In-app')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
  })

  // --- Sound effects ---
  it('Sound Effects toggle defaults to on', () => {
    renderNotifications()
    const soundToggle = screen.getAllByRole('switch')[0]
    expect(soundToggle).toHaveAttribute('aria-checked', 'true')
  })

  it('Sound Effects toggle writes to localStorage', async () => {
    const user = userEvent.setup()
    renderNotifications()
    const soundToggle = screen.getAllByRole('switch')[0]
    await user.click(soundToggle)
    expect(localStorage.getItem('wr_sound_effects_enabled')).toBe('false')
  })

  // --- Push master toggle ---
  it('push master toggle defaults to OFF', () => {
    renderNotifications()
    const masterToggle = screen.getByLabelText(/Enable notifications/i, { selector: '[role="switch"]' })
    expect(masterToggle).toHaveAttribute('aria-checked', 'false')
  })

  it('master toggle ON triggers requestPermission', async () => {
    const user = userEvent.setup()
    renderNotifications()
    const masterToggle = screen.getByLabelText(/Enable notifications/i, { selector: '[role="switch"]' })
    await user.click(masterToggle)
    expect(requestPermission).toHaveBeenCalled()
  })

  // --- Per-type toggles ---
  it('hides per-type toggles when master is OFF', () => {
    renderNotifications()
    expect(screen.queryByText('Daily verse')).not.toBeInTheDocument()
    expect(screen.queryByText('Streak reminders')).not.toBeInTheDocument()
  })

  it('shows per-type toggles when enabled and granted', () => {
    vi.mocked(getPermissionState).mockReturnValue('granted')
    localStorage.setItem('wr_notification_prefs', JSON.stringify({
      enabled: true, dailyVerse: true, streakReminder: true,
      dailyVerseTime: '08:00', lastDailyVerseFired: '', lastStreakReminderFired: '',
    }))
    renderNotifications()
    expect(screen.getByText('Daily verse')).toBeInTheDocument()
    expect(screen.getByText('Streak reminders')).toBeInTheDocument()
  })

  // --- Time picker ---
  it('shows time picker when daily verse is enabled', () => {
    vi.mocked(getPermissionState).mockReturnValue('granted')
    localStorage.setItem('wr_notification_prefs', JSON.stringify({
      enabled: true, dailyVerse: true, streakReminder: true,
      dailyVerseTime: '08:00', lastDailyVerseFired: '', lastStreakReminderFired: '',
    }))
    renderNotifications()
    const timePicker = screen.getByLabelText('Daily verse notification time')
    expect(timePicker).toBeInTheDocument()
    expect(timePicker).toHaveValue('08:00')
  })

  // --- Test notification button ---
  it('shows test notification button when granted and enabled', () => {
    vi.mocked(getPermissionState).mockReturnValue('granted')
    localStorage.setItem('wr_notification_prefs', JSON.stringify({
      enabled: true, dailyVerse: true, streakReminder: true,
      dailyVerseTime: '08:00', lastDailyVerseFired: '', lastStreakReminderFired: '',
    }))
    renderNotifications()
    expect(screen.getByText('Send test notification')).toBeInTheDocument()
  })

  it('test button calls fireTestNotification', async () => {
    vi.mocked(getPermissionState).mockReturnValue('granted')
    localStorage.setItem('wr_notification_prefs', JSON.stringify({
      enabled: true, dailyVerse: true, streakReminder: true,
      dailyVerseTime: '08:00', lastDailyVerseFired: '', lastStreakReminderFired: '',
    }))
    const user = userEvent.setup()
    renderNotifications()
    await user.click(screen.getByText('Send test notification'))
    expect(fireTestNotification).toHaveBeenCalled()
  })

  // --- Status indicator ---
  it('shows "Not yet enabled" for default permission', () => {
    renderNotifications()
    expect(screen.getByText('Not yet enabled')).toBeInTheDocument()
  })

  it('shows granted status', () => {
    vi.mocked(getPermissionState).mockReturnValue('granted')
    renderNotifications()
    expect(screen.getByText(/Notifications enabled/)).toBeInTheDocument()
  })

  it('shows denied status with instructions', () => {
    vi.mocked(getPermissionState).mockReturnValue('denied')
    renderNotifications()
    expect(screen.getByText(/Notifications blocked/)).toBeInTheDocument()
    expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument()
  })

  // --- Unsupported ---
  it('shows unsupported message when push not supported', () => {
    vi.mocked(getPushSupportStatus).mockReturnValue('unsupported')
    vi.mocked(getPermissionState).mockReturnValue('unsupported')
    renderNotifications()
    expect(screen.getByText(/doesn't support push notifications/)).toBeInTheDocument()
  })

  // --- iOS needs-install ---
  it('shows iOS install instructions when ios-needs-install', () => {
    vi.mocked(getPushSupportStatus).mockReturnValue('ios-needs-install')
    renderNotifications()
    expect(screen.getByText(/add Worship Room to your home screen/)).toBeInTheDocument()
  })

  // --- In-app toggle ---
  it('in-app toggle calls onUpdateNotifications', async () => {
    const user = userEvent.setup()
    const { onUpdateNotifications } = renderNotifications()
    const inAppToggle = screen.getByLabelText(/In-app notifications/i, { selector: '[role="switch"]' })
    await user.click(inAppToggle)
    expect(onUpdateNotifications).toHaveBeenCalledWith('inAppNotifications', false)
  })

  // --- Keyboard ---
  it('ToggleSwitch has role="switch"', () => {
    renderNotifications()
    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)
    switches.forEach((s) => expect(s).toHaveAttribute('role', 'switch'))
  })

  it('keyboard Enter toggles', async () => {
    const user = userEvent.setup()
    const { onUpdateNotifications } = renderNotifications()
    const inAppToggle = screen.getByLabelText(/In-app notifications/i, { selector: '[role="switch"]' })
    inAppToggle.focus()
    await user.keyboard('{Enter}')
    expect(onUpdateNotifications).toHaveBeenCalledWith('inAppNotifications', false)
  })
})
