import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock all external dependencies before importing the module under test
vi.mock('@/lib/bible/votdSelector', () => ({
  selectVotdForDate: vi.fn(() => ({
    ref: 'Psalm 23:1',
    book: 'psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 1,
    theme: 'peace',
  })),
}))

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn(() =>
    Promise.resolve({
      verses: [{ number: 1, text: 'The Lord is my shepherd; I shall not want.' }],
    }),
  ),
}))

vi.mock('@/lib/bible/streakStore', () => ({
  getStreak: vi.fn(() => ({ lastReadDate: '', count: 0 })),
}))

vi.mock('@/lib/bible/dateUtils', () => ({
  getTodayLocal: vi.fn(() => '2026-04-12'),
}))

vi.mock('../store', () => ({
  storePayload: vi.fn(() => Promise.resolve()),
}))

vi.mock('../preferences', () => ({
  getNotificationPrefs: vi.fn(() => ({
    enabled: false,
    dailyVerse: true,
    streakReminder: true,
    dailyVerseTime: '08:00',
    lastDailyVerseFired: '',
    lastStreakReminderFired: '',
  })),
  updateNotificationPrefs: vi.fn((updates) => updates),
}))

vi.mock('../content', () => ({
  generateDailyVersePayload: vi.fn((_entry, _text) => ({
    title: 'Psalm 23:1',
    body: 'The Lord is my shepherd.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'daily-verse',
    data: { url: '/bible/psalms/23?verse=1' },
  })),
  generateStreakReminderPayload: vi.fn(() => ({
    title: 'Still time to read today',
    body: 'A short chapter, a moment of peace. No pressure.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'streak-reminder',
    data: { url: '/daily?tab=devotional' },
  })),
}))

import { prepareAndSchedule, fireTestNotification } from '../scheduler'
import { getNotificationPrefs, updateNotificationPrefs } from '../preferences'
import { storePayload } from '../store'
import { getStreak } from '@/lib/bible/streakStore'

// SW registration mock
const mockShowNotification = vi.fn(() => Promise.resolve())
const mockRegistration = { showNotification: mockShowNotification }

describe('prepareAndSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(mockRegistration) },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips entirely when notifications are disabled', async () => {
    vi.mocked(getNotificationPrefs).mockReturnValue({
      enabled: false,
      dailyVerse: true,
      streakReminder: true,
      dailyVerseTime: '08:00',
      lastDailyVerseFired: '',
      lastStreakReminderFired: '',
    })

    await prepareAndSchedule()

    expect(storePayload).not.toHaveBeenCalled()
    expect(mockShowNotification).not.toHaveBeenCalled()
  })

  it('stores daily verse payload in IDB when enabled', async () => {
    vi.mocked(getNotificationPrefs).mockReturnValue({
      enabled: true,
      dailyVerse: true,
      streakReminder: false,
      dailyVerseTime: '08:00',
      lastDailyVerseFired: '2026-04-12', // already fired — won't fire again but will still store
      lastStreakReminderFired: '',
    })

    // Need Notification.permission = 'granted'
    Object.defineProperty(window, 'Notification', {
      value: class { static permission: NotificationPermission = 'granted' },
      configurable: true,
    })

    await prepareAndSchedule()

    expect(storePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'daily-verse',
        scheduledDate: '2026-04-12',
      }),
    )
  })

  it('fires daily verse notification when time has passed and not yet fired today', async () => {
    // Set current time to 10:00 AM (past the 08:00 default)
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12, 10, 0, 0))

    vi.mocked(getNotificationPrefs).mockReturnValue({
      enabled: true,
      dailyVerse: true,
      streakReminder: false,
      dailyVerseTime: '08:00',
      lastDailyVerseFired: '', // not fired today
      lastStreakReminderFired: '',
    })

    Object.defineProperty(window, 'Notification', {
      value: class { static permission: NotificationPermission = 'granted' },
      configurable: true,
    })

    await prepareAndSchedule()

    expect(mockShowNotification).toHaveBeenCalledWith(
      'Psalm 23:1',
      expect.objectContaining({ tag: 'daily-verse' }),
    )
    expect(updateNotificationPrefs).toHaveBeenCalledWith({ lastDailyVerseFired: '2026-04-12' })

    vi.useRealTimers()
  })

  it('does not double-fire when daily verse was already fired today', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12, 10, 0, 0))

    vi.mocked(getNotificationPrefs).mockReturnValue({
      enabled: true,
      dailyVerse: true,
      streakReminder: false,
      dailyVerseTime: '08:00',
      lastDailyVerseFired: '2026-04-12', // already fired
      lastStreakReminderFired: '',
    })

    Object.defineProperty(window, 'Notification', {
      value: class { static permission: NotificationPermission = 'granted' },
      configurable: true,
    })

    await prepareAndSchedule()

    expect(mockShowNotification).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('skips streak reminder when user has already read today', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12, 20, 0, 0)) // 8 PM — past the 18:00 reminder time

    vi.mocked(getNotificationPrefs).mockReturnValue({
      enabled: true,
      dailyVerse: false,
      streakReminder: true,
      dailyVerseTime: '08:00',
      lastDailyVerseFired: '',
      lastStreakReminderFired: '', // not fired
    })

    // User HAS read today
    vi.mocked(getStreak).mockReturnValue({ lastReadDate: '2026-04-12', count: 5 })

    Object.defineProperty(window, 'Notification', {
      value: class { static permission: NotificationPermission = 'granted' },
      configurable: true,
    })

    await prepareAndSchedule()

    // storePayload is called (payload is prepared) but showNotification should NOT fire
    expect(mockShowNotification).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})

describe('fireTestNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ showNotification: mockShowNotification }) },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when permission is not granted', async () => {
    Object.defineProperty(window, 'Notification', {
      value: class { static permission: NotificationPermission = 'default' },
      configurable: true,
    })

    const result = await fireTestNotification()
    expect(result).toBe(false)
    expect(mockShowNotification).not.toHaveBeenCalled()
  })

  it('fires notification and returns true when permission is granted', async () => {
    Object.defineProperty(window, 'Notification', {
      value: class { static permission: NotificationPermission = 'granted' },
      configurable: true,
    })

    const result = await fireTestNotification()
    expect(result).toBe(true)
    expect(mockShowNotification).toHaveBeenCalledWith(
      'Psalm 23:1',
      expect.objectContaining({
        body: expect.any(String),
        tag: 'daily-verse',
      }),
    )
  })
})
