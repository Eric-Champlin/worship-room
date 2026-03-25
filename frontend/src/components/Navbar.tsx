import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, Book, BookOpen, ChevronDown, Menu, Sparkles, WifiOff, X,
  Star, Gift, Heart, Cross, Sun, Flame, Leaf,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { NotificationPanel } from '@/components/dashboard/NotificationPanel'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getActiveChallengeInfo } from '@/lib/challenge-calendar'
import { CHALLENGES } from '@/data/challenges'

const SEASON_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Star, Gift, Sparkles, Heart, Cross, Sun, Flame, Leaf,
}

const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon?: LucideIcon }> = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Ask', to: '/ask', icon: Sparkles },
  { label: 'Bible', to: '/bible', icon: Book },
  { label: 'Daily Devotional', to: '/devotional', icon: Sparkles },
  { label: 'Reading Plans', to: '/reading-plans', icon: BookOpen },
  { label: 'Challenges', to: '/challenges', icon: Flame },
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Music', to: '/music' },
]

const LOCAL_SUPPORT_LINKS = [
  { label: 'Churches', to: '/local-support/churches' },
  { label: 'Counselors', to: '/local-support/counselors' },
  { label: 'Celebrate Recovery', to: '/local-support/celebrate-recovery' },
] as const

function getNavLinkClass(transparent: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
      "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
      transparent ? 'after:bg-white' : 'after:bg-primary',
      isActive
        ? cn(
            'after:scale-x-100',
            transparent ? 'text-white' : 'text-primary'
          )
        : cn(
            'after:scale-x-0 hover:after:scale-x-100',
            transparent
              ? 'text-white/90 hover:text-white'
              : 'text-text-dark hover:text-primary'
          )
    )
}

function NavbarLogo({ transparent }: { transparent: boolean }) {
  const { icon, themeColor, isNamedSeason } = useLiturgicalSeason()
  const SeasonIcon = isNamedSeason ? SEASON_ICON_MAP[icon] : null

  return (
    <Link to="/" className="flex items-center gap-1.5" aria-label="Worship Room home">
      <span
        className={cn(
          'font-script text-4xl font-bold',
          transparent ? 'text-white' : 'text-primary'
        )}
      >
        Worship Room
      </span>
      {SeasonIcon && (
        <SeasonIcon
          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
          style={{ color: `${themeColor}80` }}
          aria-hidden="true"
        />
      )}
    </Link>
  )
}

interface NavDropdownProps {
  label: string
  to: string
  links: ReadonlyArray<{ label: string; to: string }>
  dropdownId: string
  transparent: boolean
  extraActivePaths?: readonly string[]
}

function NavDropdown({
  label,
  to,
  links,
  dropdownId,
  transparent,
  extraActivePaths = [],
}: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  const open = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsOpen(true)
  }, [])

  const closeWithDelay = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
      closeTimerRef.current = null
    }, 150)
  }, [])

  const close = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsOpen(false)
  }, [])

  // Close on any navigation (path or query param change, e.g. /daily?tab=...)
  useEffect(() => {
    close()
  }, [location.pathname, location.search, close])

  // Close on Escape and return focus to trigger
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, close])

  // Close on focus leaving the wrapper
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.relatedTarget as Node)) {
        close()
      }
    },
    [close]
  )

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const isActive = links.some(
    (link) => location.pathname === link.to
  ) || extraActivePaths.some((p) => location.pathname === p)

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative flex items-center py-2',
        "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
        transparent ? 'after:bg-white' : 'after:bg-primary',
        isActive
          ? 'after:scale-x-100'
          : 'after:scale-x-0 hover:after:scale-x-100'
      )}
      onMouseEnter={open}
      onMouseLeave={closeWithDelay}
      onBlur={handleBlur}
    >
      <NavLink
        to={to}
        className={cn(
          'text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
          isActive
            ? transparent ? 'text-white' : 'text-primary'
            : transparent
              ? 'text-white/90 hover:text-white'
              : 'text-text-dark hover:text-primary'
        )}
      >
        {label}
      </NavLink>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'ml-0.5 rounded p-0.5 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isActive
            ? transparent ? 'text-white' : 'text-primary'
            : transparent
              ? 'text-white/90 hover:text-white'
              : 'text-text-dark hover:text-primary'
        )}
        aria-expanded={isOpen}
        aria-controls={isOpen ? dropdownId : undefined}
        aria-label={`${label} menu`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 min-w-[180px] pt-2">
          <ul
            id={dropdownId}
            role="list"
            className={cn(
              'motion-safe:animate-dropdown-in rounded-xl shadow-lg py-1.5',
              transparent
                ? 'bg-hero-bg/95 backdrop-blur-xl border border-white/10'
                : 'bg-white border border-gray-200'
            )}
          >
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  aria-current={location.pathname === link.to ? 'page' : undefined}
                  className={cn(
                    'group min-h-[44px] flex items-center px-4 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                    transparent
                      ? 'text-white/80 hover:bg-white/5 hover:text-white'
                      : 'text-nav-text-dark hover:bg-nav-hover-light'
                  )}
                >
                  <span
                    className={cn(
                      'relative pb-0.5',
                      "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
                      transparent ? 'after:bg-white' : 'after:bg-primary',
                      'after:scale-x-0 group-hover:after:scale-x-100'
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DesktopNav({ transparent }: { transparent: boolean }) {
  const activeChallengeInfo = getActiveChallengeInfo()

  return (
    <div className="hidden items-center gap-6 lg:flex">
      {NAV_LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} className={getNavLinkClass(transparent)}>
          {link.icon && <link.icon size={14} className="mr-1 inline-block" />}
          {link.label}
          {link.to === '/challenges' && activeChallengeInfo && (
            <span
              className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse"
              style={{ backgroundColor: CHALLENGES.find((c) => c.id === activeChallengeInfo.challengeId)?.themeColor }}
              aria-hidden="true"
            />
          )}
        </NavLink>
      ))}
      <NavDropdown
        label="Local Support"
        to="/local-support/churches"
        links={LOCAL_SUPPORT_LINKS}
        dropdownId="local-support-dropdown"
        transparent={transparent}
      />
    </div>
  )
}

function DesktopAuthActions({ transparent }: { transparent: boolean }) {
  const authModal = useAuthModal()
  const { isOnline } = useOnlineStatus()
  return (
    <div className="hidden items-center gap-4 lg:flex">
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
      <button
        type="button"
        onClick={() => authModal?.openAuthModal(undefined, 'login')}
        className={cn(
          'relative py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
          "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
          transparent ? 'after:bg-white' : 'after:bg-primary',
          transparent
            ? 'text-white/90 hover:text-white after:scale-x-0 hover:after:scale-x-100'
            : 'text-text-dark hover:text-primary after:scale-x-0 hover:after:scale-x-100'
        )}
      >
        Log In
      </button>
      <button
        type="button"
        onClick={() => authModal?.openAuthModal(undefined, 'register')}
        className={cn(
          'inline-flex items-center rounded-full px-5 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          transparent
            ? 'bg-white/20 hover:bg-white/30 border border-white/30'
            : 'bg-primary hover:bg-primary-lt'
        )}
      >
        Get Started
      </button>
    </div>
  )
}

const AVATAR_MENU_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Friends', to: '/friends' },
  { label: 'My Prayer Requests', to: '/prayer-wall/dashboard' },
  { label: 'My Prayers', to: '/my-prayers' },
  { label: 'Mood Insights', to: '/insights' },
  { label: 'Monthly Report', to: '/insights/monthly' },
  { label: 'Settings', to: '/settings' },
] as const

// Mobile drawer uses a different order: Mood Insights right after Friends per spec
const MOBILE_DRAWER_EXTRA_LINKS = [
  { label: 'Friends', to: '/friends' },
  { label: 'Mood Insights', to: '/insights' },
  { label: 'Monthly Report', to: '/insights/monthly' },
  { label: 'My Prayer Requests', to: '/prayer-wall/dashboard' },
  { label: 'My Prayers', to: '/my-prayers' },
  { label: 'Settings', to: '/settings' },
] as const

function DesktopUserActions() {
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

  const initial = user?.name.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="hidden items-center gap-3 lg:flex" ref={wrapperRef}>
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

      <div className="relative">
        <button
          ref={avatarTriggerRef}
          type="button"
          onClick={toggleAvatar}
          aria-haspopup="menu"
          aria-expanded={isAvatarOpen}
          aria-controls={isAvatarOpen ? 'user-menu-dropdown' : undefined}
          aria-label="User menu"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {initial}
        </button>

        {isAvatarOpen && (
          <div className="absolute right-0 top-full z-50 min-w-[200px] pt-2">
            <div
              id="user-menu-dropdown"
              role="menu"
              className="motion-safe:animate-dropdown-in rounded-xl border border-white/15 bg-hero-mid py-1.5 shadow-lg"
            >
              {user && (
                <Link
                  to={`/profile/${user.id}`}
                  role="menuitem"
                  onClick={() => setIsAvatarOpen(false)}
                  className="flex min-h-[44px] items-center rounded px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  My Profile
                </Link>
              )}
              {AVATAR_MENU_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  role="menuitem"
                  onClick={() => setIsAvatarOpen(false)}
                  className="flex min-h-[44px] items-center rounded px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-1 border-white/15" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full min-h-[44px] items-center rounded px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  onBellTap?: () => void
}

function MobileDrawer({ isOpen, onClose, onBellTap }: MobileDrawerProps) {
  const authModal = useAuthModal()
  const { isAuthenticated, user, logout } = useAuth()
  const { isOnline } = useOnlineStatus()
  const navigate = useNavigate()
  const activeChallengeInfo = getActiveChallengeInfo()
  const drawerRef = useRef<HTMLElement>(null)

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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      {isOpen && (
        <nav
          ref={drawerRef}
          id="mobile-menu"
          aria-label="Mobile navigation"
          className={cn(
            'relative z-50 mt-2 rounded-xl shadow-lg motion-safe:animate-dropdown-in lg:hidden',
            isAuthenticated
              ? 'bg-hero-mid border border-white/15'
              : 'bg-white border border-gray-200'
          )}
        >
          <div className="flex flex-col px-4 py-4">
            {/* Offline indicator */}
            {!isOnline && (
              <div className={cn(
                'mb-3 flex items-center gap-2 px-3 pb-3',
                isAuthenticated ? 'border-b border-white/15' : 'border-b border-gray-100'
              )}>
                <WifiOff
                  className={cn('h-4 w-4', isAuthenticated ? 'text-white/40' : 'text-text-light')}
                  aria-label="You're offline — some features are limited"
                />
                <span className={cn('text-xs', isAuthenticated ? 'text-white/40' : 'text-text-light')}>
                  You&apos;re offline
                </span>
              </div>
            )}

            {/* Logged-in: avatar + name at top */}
            {isAuthenticated && user && (
              <div className="mb-3 flex items-center gap-3 px-3 pb-3 border-b border-white/15">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-white">{user.name}</span>
              </div>
            )}

            {/* Logged-in: Dashboard link first */}
            {isAuthenticated && (
              <NavLink
                to="/"
                end
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isActive
                      ? 'text-white'
                      : 'text-white/80 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                Dashboard
              </NavLink>
            )}

            {/* Common nav links */}
            {NAV_LINKS.map((link, index) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    (index > 0 || isAuthenticated) && (isAuthenticated ? 'mt-2 border-t border-white/15 pt-2' : 'mt-2 border-t border-gray-100 pt-2'),
                    isAuthenticated
                      ? isActive ? 'text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'
                      : isActive ? 'text-nav-text-dark' : 'text-nav-text-dark hover:bg-nav-hover-light'
                  )
                }
              >
                {link.icon && <link.icon size={16} className="mr-2 inline-block" />}
                {link.label}
                {link.to === '/challenges' && activeChallengeInfo && (
                  <span
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse"
                    style={{ backgroundColor: CHALLENGES.find((c) => c.id === activeChallengeInfo.challengeId)?.themeColor }}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            ))}

            {/* Local Support section */}
            <div
              className={cn(
                'mt-2 pt-2',
                isAuthenticated ? 'border-t border-white/15' : 'border-t border-gray-100'
              )}
              role="group"
              aria-labelledby="local-support-heading"
            >
              <span
                id="local-support-heading"
                className={cn(
                  'px-3 text-xs font-semibold uppercase tracking-wider',
                  isAuthenticated ? 'text-white/50' : 'text-primary/50'
                )}
              >
                Local Support
              </span>
              {LOCAL_SUPPORT_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'min-h-[44px] flex items-center rounded-md px-3 pl-6 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      isAuthenticated
                        ? isActive ? 'text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'
                        : isActive ? 'text-nav-text-dark' : 'text-nav-text-dark hover:bg-nav-hover-light'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Logged-in: extra nav items */}
            {isAuthenticated && user && (
              <div className="mt-2 border-t border-white/15 pt-2">
                <NavLink
                  to={`/profile/${user.id}`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      isActive
                        ? 'text-white'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  My Profile
                </NavLink>
                {MOBILE_DRAWER_EXTRA_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        isActive
                          ? 'text-white'
                          : 'text-white/80 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Bottom section: auth actions or log out */}
            {isAuthenticated ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-white/15 pt-4">
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
            ) : (
              <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => { authModal?.openAuthModal(undefined, 'login'); onClose() }}
                  className={cn(
                    'relative min-h-[44px] flex items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    "after:absolute after:bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
                    'text-nav-text-dark after:scale-x-0 hover:after:scale-x-100'
                  )}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { authModal?.openAuthModal(undefined, 'register'); onClose() }}
                  className="min-h-[44px] flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </>
  )
}

interface NavbarProps {
  transparent?: boolean
}

/**
 * Auth-gated mobile notification bottom sheet.
 * Keeps useNotificationActions (and its localStorage reads/writes) out of
 * the always-rendered Navbar, satisfying the demo-mode "zero persistence" rule.
 */
function MobileNotificationSheet({
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

export function Navbar({ transparent = false }: NavbarProps) {
  const { isAuthenticated } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobileBellOpen, setIsMobileBellOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
    setIsMobileBellOpen(false)
  }, [location.pathname])

  // Close mobile menu on Escape and return focus to hamburger
  useEffect(() => {
    if (!isMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
        hamburgerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  return (
    <nav
      className={cn(
        'top-0 z-50',
        transparent ? 'absolute inset-x-0 bg-transparent' : 'bg-hero-dark'
      )}
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-2 sm:px-6">
        <div
          className={cn(
            'rounded-2xl',
            transparent
              ? 'liquid-glass'
              : 'bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25'
          )}
        >
          <div className="flex items-center justify-between px-6 py-3">
            <NavbarLogo transparent />
            <DesktopNav transparent />
            {isAuthenticated ? (
              <DesktopUserActions />
            ) : (
              <DesktopAuthActions transparent />
            )}

            {/* Hamburger button — visible below lg */}
            <button
              ref={hamburgerRef}
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden',
                'text-white hover:bg-white/10 hover:text-white'
              )}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? 'mobile-menu' : undefined}
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

        </div>

        {transparent && (
          <div
            className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            aria-hidden="true"
          />
        )}

        <MobileDrawer
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onBellTap={() => setIsMobileBellOpen(true)}
        />
      </div>

      {/* Mobile notification bottom sheet — auth-gated to prevent localStorage writes for logged-out users */}
      {isAuthenticated && (
        <MobileNotificationSheet
          isOpen={isMobileBellOpen}
          onClose={() => setIsMobileBellOpen(false)}
        />
      )}
    </nav>
  )
}
