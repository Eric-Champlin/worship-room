import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotifications } from '../useNotifications'
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications-mock-data'

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns notifications sorted newest first (mock data order)', () => {
    const { result } = renderHook(() => useNotifications())
    const timestamps = result.current.notifications.map((n) => new Date(n.timestamp).getTime())
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1])
    }
  })

  it('unreadCount matches notifications with read: false', () => {
    const { result } = renderHook(() => useNotifications())
    expect(result.current.unreadCount).toBe(6)
  })

  it('markAsRead sets specific notification to read', () => {
    const { result } = renderHook(() => useNotifications())
    const targetId = MOCK_NOTIFICATIONS[0].id // notif-1, unread

    act(() => {
      result.current.markAsRead(targetId)
    })

    const target = result.current.notifications.find((n) => n.id === targetId)
    expect(target?.read).toBe(true)
    // Others unchanged
    const otherUnread = result.current.notifications.filter((n) => !n.read && n.id !== targetId)
    expect(otherUnread).toHaveLength(5)
  })

  it('markAllAsRead sets all to read', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.markAllAsRead()
    })

    const allRead = result.current.notifications.every((n) => n.read)
    expect(allRead).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('dismiss removes notification from array', () => {
    const { result } = renderHook(() => useNotifications())
    const initialLength = result.current.notifications.length
    const targetId = MOCK_NOTIFICATIONS[0].id

    act(() => {
      result.current.dismiss(targetId)
    })

    expect(result.current.notifications).toHaveLength(initialLength - 1)
    expect(result.current.notifications.find((n) => n.id === targetId)).toBeUndefined()
  })

  it('addNotification prepends with generated ID', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.addNotification({
        type: 'encouragement',
        message: 'Test notification',
        read: false,
        timestamp: new Date().toISOString(),
        actionUrl: '/friends',
      })
    })

    expect(result.current.notifications[0].message).toBe('Test notification')
    expect(result.current.notifications[0].id).toBeTruthy()
    expect(result.current.notifications).toHaveLength(14)
  })

  it('addNotification enforces 50-cap', () => {
    // Fill localStorage with 50 notifications
    const fiftyNotifs = Array.from({ length: 50 }, (_, i) => ({
      id: `fill-${i}`,
      type: 'nudge' as const,
      message: `fill ${i}`,
      read: true,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
    }))
    localStorage.setItem('wr_notifications', JSON.stringify(fiftyNotifs))

    const { result } = renderHook(() => useNotifications())
    expect(result.current.notifications).toHaveLength(50)

    act(() => {
      result.current.addNotification({
        type: 'milestone',
        message: 'New achievement!',
        read: false,
        timestamp: new Date().toISOString(),
        actionUrl: '/',
      })
    })

    expect(result.current.notifications).toHaveLength(50)
    expect(result.current.notifications[0].message).toBe('New achievement!')
  })

  it('cross-tab sync updates state on storage event', () => {
    const { result } = renderHook(() => useNotifications())

    const updatedNotifications = [
      { id: 'cross-tab-1', type: 'nudge', message: 'From another tab', read: false, timestamp: new Date().toISOString() },
    ]

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'wr_notifications',
          newValue: JSON.stringify(updatedNotifications),
        }),
      )
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].message).toBe('From another tab')
  })

  it('cross-tab sync ignores other keys', () => {
    const { result } = renderHook(() => useNotifications())
    const initialLength = result.current.notifications.length

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'wr_other_key',
          newValue: JSON.stringify([]),
        }),
      )
    })

    expect(result.current.notifications).toHaveLength(initialLength)
  })
})
