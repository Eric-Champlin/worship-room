import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAILY_LINKS = [
  { label: 'Pray', to: '/scripture' },
  { label: 'Journal', to: '/journal' },
  { label: 'Meditate', to: '/meditate' },
  { label: 'Verse & Song', to: '/daily' },
] as const

const MUSIC_LINKS = [
  { label: 'Worship Playlists', to: '/music/playlists' },
  { label: 'Ambient Sounds', to: '/music/ambient' },
  { label: 'Sleep & Rest', to: '/music/sleep' },
] as const

const NAV_LINKS = [
  { label: 'Prayer Wall', to: '/prayer-wall' },
] as const

const LOCAL_SUPPORT_LINKS = [
  { label: 'Churches', to: '/churches' },
  { label: 'Counselors', to: '/counselors' },
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
  return (
    <Link to="/" className="flex items-center" aria-label="Worship Room home">
      <span
        className={cn(
          'font-script text-4xl font-bold',
          transparent ? 'text-white' : 'text-primary'
        )}
      >
        Worship Room
      </span>
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

  // Close on route change
  useEffect(() => {
    close()
  }, [location.pathname, close])

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
        aria-haspopup="true"
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
        <div className="absolute left-0 top-full min-w-[180px] pt-2">
          <ul
            id={dropdownId}
            role="list"
            className={cn(
              'animate-dropdown-in rounded-xl py-1.5',
              transparent
                ? 'bg-gradient-to-b from-[#351868] to-[#200b42] border border-white/10 shadow-[0_8px_32px_-4px_rgba(109,40,217,0.4)]'
                : 'bg-white shadow-[0_4px_24px_-4px_rgba(109,40,217,0.25)] ring-1 ring-primary/10'
            )}
          >
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive: linkActive }) =>
                    cn(
                      'group min-h-[44px] flex items-center px-4 py-2 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                      linkActive
                        ? transparent ? 'text-white' : 'text-primary'
                        : transparent ? 'text-white/90 hover:text-white' : 'text-text-dark hover:text-primary'
                    )
                  }
                >
                  {({ isActive: linkActive }) => (
                    <span
                      className={cn(
                        'relative pb-0.5',
                        "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
                        transparent ? 'after:bg-white' : 'after:bg-primary',
                        linkActive
                          ? 'after:scale-x-100'
                          : 'after:scale-x-0 group-hover:after:scale-x-100'
                      )}
                    >
                      {link.label}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DesktopNav({ transparent }: { transparent: boolean }) {
  return (
    <div className="hidden items-center gap-6 lg:flex">
      <NavDropdown
        label="Daily"
        to="/daily"
        links={DAILY_LINKS}
        dropdownId="daily-dropdown"
        transparent={transparent}
      />
      <NavDropdown
        label="Music"
        to="/music"
        links={MUSIC_LINKS}
        dropdownId="music-dropdown"
        transparent={transparent}
        extraActivePaths={['/music']}
      />
      {NAV_LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} className={getNavLinkClass(transparent)}>
          {link.label}
        </NavLink>
      ))}
      <NavDropdown
        label="Local Support"
        to="/churches"
        links={LOCAL_SUPPORT_LINKS}
        dropdownId="local-support-dropdown"
        transparent={transparent}
      />
    </div>
  )
}

function DesktopAuthActions({ transparent }: { transparent: boolean }) {
  return (
    <div className="hidden items-center gap-4 lg:flex">
      <Link
        to="/login"
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
      </Link>
      <Link
        to="/register"
        className={cn(
          'inline-flex items-center rounded-full px-5 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          transparent
            ? 'bg-white/20 hover:bg-white/30 border border-white/30'
            : 'bg-primary hover:bg-primary-lt'
        )}
      >
        Get Started
      </Link>
    </div>
  )
}

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
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
          className="relative z-50 mt-2 rounded-xl bg-gradient-to-b from-[#351868] to-[#200b42] border border-white/10 shadow-[0_8px_32px_-4px_rgba(109,40,217,0.4)] animate-dropdown-in lg:hidden"
        >
          <div className="flex flex-col px-4 py-4">
            {/* Daily section */}
            <div role="group" aria-labelledby="daily-heading">
              <span
                id="daily-heading"
                className="px-3 text-xs font-semibold uppercase tracking-wider text-white/50"
              >
                Daily
              </span>
              {DAILY_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'min-h-[44px] flex items-center rounded-md px-3 pl-6 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      isActive
                        ? 'text-white'
                        : 'text-white/90 hover:text-white'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Music section */}
            <div
              className="mt-2 border-t border-white/15 pt-2"
              role="group"
              aria-labelledby="music-heading"
            >
              <span
                id="music-heading"
                className="px-3 text-xs font-semibold uppercase tracking-wider text-white/50"
              >
                Music
              </span>
              {MUSIC_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'min-h-[44px] flex items-center rounded-md px-3 pl-6 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      isActive
                        ? 'text-white'
                        : 'text-white/90 hover:text-white'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Standalone link: Prayer Wall */}
            <div className="mt-2 border-t border-white/15 pt-2">
              {NAV_LINKS.map((link) => (
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
                        : 'text-white/90 hover:text-white'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Local Support section */}
            <div
              className="mt-2 border-t border-white/15 pt-2"
              role="group"
              aria-labelledby="local-support-heading"
            >
              <span
                id="local-support-heading"
                className="px-3 text-xs font-semibold uppercase tracking-wider text-white/50"
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
                      isActive
                        ? 'text-white'
                        : 'text-white/90 hover:text-white'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Auth actions */}
            <div className="mt-4 flex flex-col gap-2 border-t border-white/15 pt-4">
              <Link
                to="/login"
                onClick={onClose}
                className={cn(
                  'relative min-h-[44px] flex items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  "after:absolute after:bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-white after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
                  'text-white/90 hover:text-white after:scale-x-0 hover:after:scale-x-100'
                )}
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="min-h-[44px] flex items-center justify-center rounded-full bg-white/20 border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      )}
    </>
  )
}

interface NavbarProps {
  transparent?: boolean
}

export function Navbar({ transparent = false }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
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
        transparent ? 'absolute inset-x-0 bg-transparent' : 'bg-gradient-to-b from-hero-dark to-hero-mid'
      )}
      aria-label="Main navigation"
    >
      <div className={cn(
        'mx-auto max-w-6xl px-4 pb-2 sm:px-6',
        transparent ? 'pt-5' : 'pt-3'
      )}>
        <div
          className="rounded-2xl bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25"
        >
          <div className="flex items-center justify-between px-6 py-3">
            <NavbarLogo transparent />
            <DesktopNav transparent />
            <DesktopAuthActions transparent />

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

        <MobileDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </div>
    </nav>
  )
}
