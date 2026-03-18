import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { useFriends } from '@/hooks/useFriends'
import { useToastSafe } from '@/components/ui/Toast'
import type { NotificationEntry } from '@/types/dashboard'

/**
 * Shared notification action handlers used by both desktop (DesktopUserActions)
 * and mobile (MobileNotificationSheet) notification panels.
 *
 * IMPORTANT: Only call this hook inside auth-gated components — it initializes
 * useNotifications() which seeds wr_notifications to localStorage.
 */
export function useNotificationActions(onClosePanel: () => void) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss, addNotification } =
    useNotifications()
  const { friends, acceptRequest } = useFriends()
  const { showToast } = useToastSafe()
  const navigate = useNavigate()

  const handleTap = useCallback(
    (notification: NotificationEntry) => {
      markAsRead(notification.id)
      onClosePanel()
      if (notification.actionUrl) {
        navigate(notification.actionUrl)
      }
    },
    [markAsRead, onClosePanel, navigate],
  )

  const handleAcceptFriend = useCallback(
    (notification: NotificationEntry) => {
      const friendId = notification.actionData?.friendRequestId
      if (friendId) {
        acceptRequest(friendId)
        dismiss(notification.id)
        const name = notification.message.split(' wants to')[0] || 'Friend'
        showToast(`You and ${name} are now friends!`)
      }
    },
    [acceptRequest, dismiss, showToast],
  )

  const handleDeclineFriend = useCallback(
    (notification: NotificationEntry) => {
      dismiss(notification.id)
    },
    [dismiss],
  )

  const checkIsAlreadyFriend = useCallback(
    (notification: NotificationEntry): boolean => {
      if (notification.type !== 'friend_request') return false
      const friendId = notification.actionData?.friendRequestId
      if (!friendId) return false
      return friends.some((f) => f.id === friendId)
    },
    [friends],
  )

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    addNotification,
    handleTap,
    handleAcceptFriend,
    handleDeclineFriend,
    checkIsAlreadyFriend,
  }
}
