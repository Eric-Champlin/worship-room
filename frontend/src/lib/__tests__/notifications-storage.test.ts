import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getNotifications, setNotifications, seedNotificationsIfNeeded, getPushNotificationFlag, setPushNotificationFlag } from '../notifications-storage'
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications-mock-data'

describe('notifications-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getNotifications', () => {
    it('returns mock data and seeds when key is missing', () => {
      const result = getNotifications()
      expect(result).toHaveLength(13)
      expect(localStorage.getItem('wr_notifications')).not.toBeNull()
    })

    it('re-seeds on corrupt JSON', () => {
      localStorage.setItem('wr_notifications', '{invalid json!!')
      const result = getNotifications()
      expect(result).toHaveLength(13)
      // localStorage should be re-seeded
      const stored = JSON.parse(localStorage.getItem('wr_notifications')!)
      expect(stored).toHaveLength(13)
    })

    it('re-seeds when stored value is not an array', () => {
      localStorage.setItem('wr_notifications', JSON.stringify({ notAnArray: true }))
      const result = getNotifications()
      expect(result).toHaveLength(13)
    })

    it('returns stored notifications when valid', () => {
      const custom = [{ id: 'test', type: 'nudge', message: 'hi', read: false, timestamp: new Date().toISOString() }]
      localStorage.setItem('wr_notifications', JSON.stringify(custom))
      const result = getNotifications()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('test')
    })
  })

  describe('setNotifications', () => {
    it('stores notifications to localStorage', () => {
      const items = MOCK_NOTIFICATIONS.slice(0, 3)
      setNotifications(items)
      const stored = JSON.parse(localStorage.getItem('wr_notifications')!)
      expect(stored).toHaveLength(3)
    })

    it('enforces 50-cap', () => {
      const items = Array.from({ length: 55 }, (_, i) => ({
        id: `n-${i}`,
        type: 'nudge' as const,
        message: `msg ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }))
      setNotifications(items)
      const stored = JSON.parse(localStorage.getItem('wr_notifications')!)
      expect(stored).toHaveLength(50)
      // Should keep the first 50 (newest, since caller maintains order)
      expect(stored[0].id).toBe('n-0')
      expect(stored[49].id).toBe('n-49')
    })

    it('handles localStorage unavailable gracefully', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })
      expect(() => setNotifications(MOCK_NOTIFICATIONS)).not.toThrow()
      spy.mockRestore()
    })
  })

  describe('seedNotificationsIfNeeded', () => {
    it('creates 13 mocks when key does not exist', () => {
      seedNotificationsIfNeeded()
      const stored = JSON.parse(localStorage.getItem('wr_notifications')!)
      expect(stored).toHaveLength(13)
    })

    it('does not overwrite existing data', () => {
      localStorage.setItem('wr_notifications', JSON.stringify([]))
      seedNotificationsIfNeeded()
      const stored = JSON.parse(localStorage.getItem('wr_notifications')!)
      expect(stored).toHaveLength(0)
    })
  })

  describe('mock data integrity', () => {
    it('has 6 unread and 7 read', () => {
      const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read)
      const read = MOCK_NOTIFICATIONS.filter((n) => n.read)
      expect(unread).toHaveLength(6)
      expect(read).toHaveLength(7)
    })

    it('includes all expected notification types', () => {
      const types = new Set(MOCK_NOTIFICATIONS.map((n) => n.type))
      expect(types.has('encouragement')).toBe(true)
      expect(types.has('friend_request')).toBe(true)
      expect(types.has('milestone')).toBe(true)
      expect(types.has('friend_milestone')).toBe(true)
      expect(types.has('nudge')).toBe(true)
      expect(types.has('weekly_recap')).toBe(true)
      expect(types.has('level_up')).toBe(true)
      expect(types.has('monthly_report')).toBe(true)
    })

    it('friend_request has actionData.friendRequestId', () => {
      const friendRequests = MOCK_NOTIFICATIONS.filter((n) => n.type === 'friend_request')
      expect(friendRequests.length).toBeGreaterThan(0)
      for (const fr of friendRequests) {
        expect(fr.actionData?.friendRequestId).toBeTruthy()
      }
    })

    it('all notifications have actionUrl', () => {
      for (const n of MOCK_NOTIFICATIONS) {
        expect(n.actionUrl).toBeTruthy()
      }
    })
  })

  describe('push notification stubs', () => {
    it('getPushNotificationFlag returns false by default', () => {
      expect(getPushNotificationFlag()).toBe(false)
    })

    it('setPushNotificationFlag persists to wr_settings', () => {
      setPushNotificationFlag(true)
      expect(getPushNotificationFlag()).toBe(true)
      setPushNotificationFlag(false)
      expect(getPushNotificationFlag()).toBe(false)
    })

    it('toggle does NOT call Notification.requestPermission', () => {
      const originalNotification = globalThis.Notification
      const mockRequestPermission = vi.fn()
      Object.defineProperty(globalThis, 'Notification', {
        value: { requestPermission: mockRequestPermission },
        writable: true,
        configurable: true,
      })

      setPushNotificationFlag(true)
      getPushNotificationFlag()

      expect(mockRequestPermission).not.toHaveBeenCalled()
      Object.defineProperty(globalThis, 'Notification', {
        value: originalNotification,
        writable: true,
        configurable: true,
      })
    })
  })
})
