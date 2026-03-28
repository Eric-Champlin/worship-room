import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { NotificationPanel } from '@/components/dashboard/NotificationPanel'
import { AvatarDropdown } from '@/components/AvatarDropdown'

export function DesktopUserActions() {
  const { user, logout } = useAuth()
  const { isOnline } = useOnlineStatus()
  const navigate = useNavigate()
  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
  const [isBellOpen, setIsBellOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const avatarTriggerRef = useRef<HTMLButtonElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const closeBell = useCallback(() => setIsBellOpen(false), [])
  const {
    notifications, unreadCount, markAsRead, markAllAsRead, dismiss,
    handleTap, handleAcceptFriend, handleDeclineFriend, checkIsAlreadyFriend,
  } = useNotificationActions(closeBell)

  // Close all on route change
  useEffect(() => {
    setIsAvatarOpen(false)
    setIsBellOpen(false)
  }, [location.pathname, location.search])

  // Close on Escape — return focus to the relevant trigger
  useEffect(() => {
    if (!isAvatarOpen && !isBellOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isBellOpen) {
          setIsBellOpen(false)
          bellRef.current?.querySelector('button')?.focus()
        } else if (isAvatarOpen) {
          setIsAvatarOpen(false)
          avatarTriggerRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAvatarOpen, isBellOpen])

  // Close on outside click
  useEffect(() => {
    if (!isAvatarOpen && !isBellOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsAvatarOpen(false)
        setIsBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isAvatarOpen, isBellOpen])

  const toggleBell = () => {
    setIsBellOpen((prev) => !prev)
    setIsAvatarOpen(false)
  }

  const toggleAvatar = () => {
    setIsAvatarOpen((prev) => !prev)
    setIsBellOpen(false)
  }

  const handleLogout = () => {
    logout()
    setIsAvatarOpen(false)
    navigate('/')
  }

  return (
    <div className="hidden items-center gap-3 md:flex" ref={wrapperRef}>
      {!isOnline && (
        <div className="group relative" title="You're offline — some features are limited">
          <WifiOff
            className="h-4 w-4 text-white/40"
            aria-label="You're offline — some features are limited"
          />
          <div className="absolute -bottom-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
            You&apos;re offline
          </div>
        </div>
      )}
      <div ref={bellRef} className="relative">
        <NotificationBell
          unreadCount={unreadCount}
          isOpen={isBellOpen}
          onToggle={toggleBell}
        />
        <NotificationPanel
          isOpen={isBellOpen}
          onClose={() => setIsBellOpen(false)}
          isMobile={false}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDismiss={dismiss}
          onAcceptFriend={handleAcceptFriend}
          onDeclineFriend={handleDeclineFriend}
          onTapNotification={handleTap}
          isAlreadyFriend={checkIsAlreadyFriend}
        />
      </div>

      {user && (
        <AvatarDropdown
          user={user}
          isOpen={isAvatarOpen}
          onToggle={toggleAvatar}
          onClose={() => setIsAvatarOpen(false)}
          onLogout={handleLogout}
          triggerRef={avatarTriggerRef}
        />
      )}
    </div>
  )
}
