import { useState, useRef, useEffect, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { NotificationPanel } from '@/components/dashboard/NotificationPanel'
import { isNavActive } from '@/components/Navbar'
import { LOCAL_SUPPORT_LINKS } from '@/components/LocalSupportDropdown'

const DAILY_LINKS = [
  { label: 'Daily Hub', to: '/daily' },
] as const

const STUDY_LINKS = [
  { label: 'Study Bible', to: '/bible' },
  { label: 'Grow', to: '/grow' },
  { label: "Ask God's Word", to: '/ask' },
] as const

const COMMUNITY_LINKS = [
  { label: 'Prayer Wall', to: '/prayer-wall' },
] as const

const LISTEN_LINKS = [
  { label: 'Music', to: '/music' },
] as const

const MY_WORSHIP_ROOM_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'My Prayers', to: '/my-prayers' },
  { label: 'Friends', to: '/friends' },
  { label: 'Mood Insights', to: '/insights' },
  { label: 'Settings', to: '/settings' },
] as const

function DrawerSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="heading"
      aria-level={2}
      className="px-3 text-xs uppercase tracking-wide text-white/50"
    >
      {children}
    </span>
  )
}

function DrawerLink({
  to,
  onClick,
  pathname,
  children,
}: {
  to: string
  onClick: () => void
  pathname: string
  children: React.ReactNode
}) {
  const active = isNavActive(to, pathname)
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
        active
          ? 'border-l-2 border-primary bg-white/[0.04] text-white'
          : 'text-white/80 hover:bg-white/5 hover:text-white'
      )}
    >
      {children}
    </Link>
  )
}

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  onBellTap?: () => void
}

export function MobileDrawer({ isOpen, onClose, onBellTap }: MobileDrawerProps) {
  const authModal = useAuthModal()
  const { isAuthenticated, logout } = useAuth()
  const { isOnline } = useOnlineStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const drawerRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleAnimatedClose = useCallback(() => {
    if (reducedMotion) {
      onClose()
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }, [onClose, reducedMotion])

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Focus trap: keep Tab within the drawer while open
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return

    const drawer = drawerRef.current
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = drawer.querySelectorAll<HTMLElement>(focusableSelector)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const renderSection = (
    heading: string,
    links: ReadonlyArray<{ label: string; to: string }>,
  ) => (
    <div className="mb-4">
      <DrawerSectionHeader>{heading}</DrawerSectionHeader>
      <div className="mt-1">
        {links.map((link) => (
          <DrawerLink key={link.to} to={link.to} onClick={onClose} pathname={location.pathname}>
            {link.label}
          </DrawerLink>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      {(isOpen || isClosing) && (
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/20 md:hidden',
            isClosing ? 'motion-safe:animate-backdrop-fade-out' : 'motion-safe:animate-backdrop-fade-in',
          )}
          onClick={handleAnimatedClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel — slide from right */}
      {(isOpen || isClosing) && (
        <nav
          ref={drawerRef}
          id="mobile-menu"
          aria-label="Mobile navigation"
          className={cn(
            'fixed right-0 top-0 bottom-0 z-50 w-[280px] overflow-y-auto bg-hero-mid border-l border-white/15 shadow-lg md:hidden',
            isClosing
              ? 'motion-safe:animate-drawer-slide-out'
              : 'motion-safe:animate-drawer-slide-in',
          )}
        >
          <div className="flex flex-col px-4 py-4">
            {/* Offline indicator */}
            {!isOnline && (
              <div className="mb-3 flex items-center gap-2 px-3 pb-3 border-b border-white/15">
                <WifiOff
                  className="h-4 w-4 text-white/40"
                  aria-label="You're offline — some features are limited"
                />
                <span className="text-xs text-white/60">
                  You&apos;re offline
                </span>
              </div>
            )}

            {/* Nav sections — visible to all */}
            {renderSection('Daily', DAILY_LINKS)}
            {renderSection('Study', STUDY_LINKS)}
            {renderSection('Community', COMMUNITY_LINKS)}
            {renderSection('Listen', LISTEN_LINKS)}
            {renderSection('Find Help', LOCAL_SUPPORT_LINKS)}

            {/* MY WORSHIP ROOM — logged-in only */}
            {isAuthenticated && (
              <>
                <div className="border-t border-white/15 pt-4 mb-4">
                  <DrawerSectionHeader>My Worship Room</DrawerSectionHeader>
                  <div className="mt-1">
                    {MY_WORSHIP_ROOM_LINKS.map((link) => (
                      <DrawerLink key={link.to} to={link.to} onClick={onClose} pathname={location.pathname}>
                        {link.label}
                      </DrawerLink>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-white/15 pt-4">
                  <button
                    type="button"
                    aria-label="Notifications"
                    onClick={() => { onClose(); onBellTap?.() }}
                    className="min-h-[44px] flex items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    Notifications
                  </button>
                  <button
                    type="button"
                    onClick={() => { logout(); navigate('/'); onClose() }}
                    className="min-h-[44px] flex items-center justify-center rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Log Out
                  </button>
                </div>
              </>
            )}

            {/* Logged-out: auth actions */}
            {!isAuthenticated && (
              <div className="flex flex-col gap-2 border-t border-white/15 pt-4">
                <button
                  type="button"
                  onClick={() => { authModal?.openAuthModal(undefined, 'login'); onClose() }}
                  className="min-h-[44px] flex items-center justify-center rounded-md px-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Log In
                </button>
                <Link
                  to="/register"
                  onClick={onClose}
                  className="min-h-[44px] flex items-center justify-center rounded-full bg-white/20 border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </>
  )
}

/**
 * Auth-gated mobile notification bottom sheet.
 * Keeps useNotificationActions (and its localStorage reads/writes) out of
 * the always-rendered Navbar, satisfying the demo-mode "zero persistence" rule.
 */
export function MobileNotificationSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const {
    notifications, unreadCount, markAsRead, markAllAsRead, dismiss,
    handleTap, handleAcceptFriend, handleDeclineFriend, checkIsAlreadyFriend,
  } = useNotificationActions(onClose)

  return (
    <NotificationPanel
      isOpen={isOpen}
      onClose={onClose}
      isMobile={true}
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
  )
}
