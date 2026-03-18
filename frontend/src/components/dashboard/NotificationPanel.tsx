import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { NotificationItem } from './NotificationItem'
import type { NotificationEntry } from '@/types/dashboard'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
  notifications: NotificationEntry[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDismiss: (id: string) => void
  onAcceptFriend: (notification: NotificationEntry) => void
  onDeclineFriend: (notification: NotificationEntry) => void
  onTapNotification: (notification: NotificationEntry) => void
  isAlreadyFriend: (notification: NotificationEntry) => boolean
}

export function NotificationPanel({
  isOpen,
  onClose,
  isMobile,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onAcceptFriend,
  onDeclineFriend,
  onTapNotification,
  isAlreadyFriend,
}: NotificationPanelProps) {
  const containerRef = useFocusTrap(isOpen, onClose)

  const allRead = notifications.length > 0 && notifications.every((n) => n.read)
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Mobile body scroll lock
  useEffect(() => {
    if (!isOpen || !isMobile) return
    document.body.classList.add('overflow-hidden')
    return () => document.body.classList.remove('overflow-hidden')
  }, [isOpen, isMobile])

  if (!isOpen) return null

  const panelContent = (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Notifications"
      className={cn(
        'flex flex-col bg-hero-mid/95 backdrop-blur-md border border-white/15 shadow-lg',
        isMobile
          ? cn('rounded-t-2xl border-t max-h-[400px]', !prefersReducedMotion && 'motion-safe:animate-slide-from-bottom')
          : cn('rounded-xl w-[320px] lg:w-[360px] max-h-[400px]', !prefersReducedMotion && 'motion-safe:animate-dropdown-in'),
      )}
    >
      {/* Mobile drag handle */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-8 rounded-full bg-white/30" aria-hidden="true" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-base font-semibold text-white">Notifications</h2>
        <button
          type="button"
          onClick={onMarkAllAsRead}
          disabled={allRead || notifications.length === 0}
          className={cn(
            'text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded',
            allRead || notifications.length === 0
              ? 'text-white/30 cursor-default'
              : 'text-primary-lt hover:text-primary',
          )}
        >
          Mark all as read
        </button>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" role="status">
        {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
      </div>

      {/* Notification list or empty state */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] px-4 py-8">
          <p className="text-lg text-white/60">All caught up! 🎉</p>
        </div>
      ) : (
        <div role="list" className="dark-scrollbar overflow-y-auto flex-1 divide-y divide-white/10" style={{ scrollbarGutter: 'stable' }}>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDismiss={onDismiss}
              onAcceptFriend={onAcceptFriend}
              onDeclineFriend={onDeclineFriend}
              onTap={onTapNotification}
              isMobile={isMobile}
              isAlreadyFriend={isAlreadyFriend(notification)}
            />
          ))}
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[60]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Sheet */}
        <div className="absolute bottom-0 left-0 right-0">
          {panelContent}
        </div>
      </div>
    )
  }

  // Desktop: dropdown positioned by parent
  return (
    <div className="absolute right-0 top-full z-[60] pt-2">
      {panelContent}
    </div>
  )
}
