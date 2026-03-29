import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NotificationEntry } from '@/types/dashboard'
import { getNotifications, setNotifications, seedNotificationsIfNeeded } from '@/lib/notifications-storage'

const STORAGE_KEY = 'wr_notifications'

export function useNotifications(): {
  notifications: NotificationEntry[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismiss: (id: string) => void
  addNotification: (n: Omit<NotificationEntry, 'id'>) => void
} {
  const [notifications, setNotificationsState] = useState<NotificationEntry[]>(() => {
    seedNotificationsIfNeeded()
    return getNotifications()
  })

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const persist = useCallback((updated: NotificationEntry[]) => {
    setNotifications(updated)
    setNotificationsState(updated)
  }, [])

  const markAsRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      )
      persist(updated)
    },
    [notifications, persist],
  )

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }))
    persist(updated)
  }, [notifications, persist])

  const dismiss = useCallback(
    (id: string) => {
      const updated = notifications.filter((n) => n.id !== id)
      persist(updated)
    },
    [notifications, persist],
  )

  const addNotification = useCallback(
    (n: Omit<NotificationEntry, 'id'>) => {
      const newNotification: NotificationEntry = {
        ...n,
        id: crypto.randomUUID(),
      }
      const updated = [newNotification, ...notifications].slice(0, 50)
      persist(updated)
    },
    [notifications, persist],
  )

  // Cross-tab sync via storage events
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      if (event.newValue === null) {
        setNotificationsState([])
        return
      }
      try {
        const parsed = JSON.parse(event.newValue)
        if (Array.isArray(parsed)) {
          setNotificationsState(parsed)
        }
      } catch (_e) {
        // Ignore corrupt cross-tab data
      }
    }

    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    addNotification,
  }
}
