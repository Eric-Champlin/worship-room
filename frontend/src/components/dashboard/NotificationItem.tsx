import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import type { NotificationEntry, NotificationType } from '@/types/dashboard'

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  encouragement: '🙏',
  friend_request: '👤',
  milestone: '🏆',
  friend_milestone: '🎉',
  nudge: '❤️',
  weekly_recap: '📊',
  level_up: '⬆️',
  monthly_report: '📋',
}

interface NotificationItemProps {
  notification: NotificationEntry
  onMarkAsRead: (id: string) => void
  onDismiss: (id: string) => void
  onAcceptFriend: (notification: NotificationEntry) => void
  onDeclineFriend: (notification: NotificationEntry) => void
  onTap: (notification: NotificationEntry) => void
  isMobile: boolean
  isAlreadyFriend?: boolean
}

export function NotificationItem({
  notification,
  onMarkAsRead: _onMarkAsRead,
  onDismiss,
  onAcceptFriend,
  onDeclineFriend,
  onTap,
  isMobile,
  isAlreadyFriend,
}: NotificationItemProps) {
  const [processingAction, setProcessingAction] = useState<'accept' | 'decline' | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const [isDismissing, setIsDismissing] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const isFriendRequest = notification.type === 'friend_request'
  const icon = NOTIFICATION_ICONS[notification.type]

  const handleRowClick = () => {
    if (isFriendRequest) return
    onTap(notification)
  }

  const handleAccept = () => {
    if (processingAction) return
    setProcessingAction('accept')
    onAcceptFriend(notification)
  }

  const handleDecline = () => {
    if (processingAction) return
    setProcessingAction('decline')
    onDeclineFriend(notification)
  }

  const handleDismissClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (prefersReducedMotion) {
      onDismiss(notification.id)
      return
    }
    setIsDismissing(true)
    setTimeout(() => onDismiss(notification.id), 200)
  }

  // Mobile swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const deltaX = e.touches[0].clientX - touchStartRef.current.x
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y)
    // Only track horizontal swipes (not vertical scroll)
    if (deltaY > Math.abs(deltaX)) return
    if (deltaX < 0) {
      setSwipeX(deltaX)
    }
  }

  const handleTouchEnd = () => {
    if (swipeX < -80) {
      if (prefersReducedMotion) {
        onDismiss(notification.id)
      } else {
        setIsDismissing(true)
        setTimeout(() => onDismiss(notification.id), 200)
      }
    } else {
      setSwipeX(0)
    }
    touchStartRef.current = null
  }

  // Extract friend name from message for aria-labels
  const friendName = notification.message.split(' wants to')[0] || 'Friend'

  return (
    <div
      role="listitem"
      className={cn(
        'relative group flex items-start gap-3 px-4 py-3 transition-colors',
        !isFriendRequest && 'cursor-pointer',
        notification.read ? 'bg-transparent' : 'bg-white/10',
        !isMobile && 'hover:bg-white/5',
        isMobile && 'min-h-[48px]',
        isDismissing && !prefersReducedMotion && 'translate-x-[-100%] opacity-0 transition-all duration-200',
      )}
      style={isMobile && swipeX < 0 ? { transform: `translateX(${swipeX}px)` } : undefined}
      onClick={handleRowClick}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Unread dot indicator */}
      {!notification.read && (
        <span
          className="absolute left-1 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-primary-lt"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl" aria-hidden="true">
        {icon}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white/90 line-clamp-2">{notification.message}</p>
        <p className="mt-0.5 text-xs text-white/50">{timeAgo(notification.timestamp)}</p>

        {/* Friend request actions */}
        {isFriendRequest && !isAlreadyFriend && (
          <div className={cn('mt-2 flex gap-2', isMobile ? 'flex-col' : 'flex-row')}>
            <button
              type="button"
              onClick={handleAccept}
              disabled={processingAction !== null}
              aria-label={`Accept friend request from ${friendName}`}
              className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={processingAction !== null}
              aria-label={`Decline friend request from ${friendName}`}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {isFriendRequest && isAlreadyFriend && (
          <p className="mt-2 text-xs text-white/50">Already friends</p>
        )}
      </div>

      {/* Dismiss X — desktop only, hover visible */}
      {!isMobile && (
        <button
          type="button"
          onClick={handleDismissClick}
          aria-label="Dismiss notification"
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rounded p-1 text-white/40 hover:text-white/70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
