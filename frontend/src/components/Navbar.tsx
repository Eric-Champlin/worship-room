import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Pray', to: '/pray' },
  { label: 'Journal', to: '/journal' },
  { label: 'Meditate', to: '/meditate' },
  { label: 'Music', to: '/music' },
  { label: 'Prayer Wall', to: '/prayer-wall' },
] as const

const CONNECT_LINKS = [
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
          'text-4xl font-bold',
          transparent ? 'text-white' : 'text-primary'
        )}
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        Worship Room
      </span>
    </Link>
  )
}

function ConnectDropdown({ transparent }: { transparent: boolean }) {
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

  // Close on focus leaving the wrapper and return focus to trigger
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

  // Check if any connect link is active
  const isConnectActive = CONNECT_LINKS.some(
    (link) => location.pathname === link.to
  )

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={open}
      onMouseLeave={closeWithDelay}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'relative flex items-center gap-1 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
          "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
          transparent ? 'after:bg-white' : 'after:bg-primary',
          isConnectActive
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
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'connect-dropdown' : undefined}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Local Support
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full w-44 pt-2">
        <ul
          id="connect-dropdown"
          className={cn(
            'rounded-md py-1 shadow-lg',
            transparent
              ? 'bg-white/[0.08] backdrop-blur-xl saturate-[1.8] border border-white/25 ring-0'
              : 'bg-white ring-1 ring-black/5'
          )}
        >
          {CONNECT_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'block px-4 py-2 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                    transparent
                      ? isActive
                        ? 'text-white bg-white/10'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                      : isActive
                        ? 'bg-primary/5 text-primary'
                        : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
                  )
                }
              >
                {link.label}
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
      {NAV_LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} className={getNavLinkClass(transparent)}>
          {link.label}
        </NavLink>
      ))}
      <ConnectDropdown transparent={transparent} />
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
        <div
          id="mobile-menu"
          aria-label="Navigation menu"
          className="relative z-50 border-t border-gray-100 lg:hidden"
        >
          <div className="flex flex-col px-4 py-4">
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
                      ? 'bg-primary/5 text-primary'
                      : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}

            {/* Local Support section */}
            <div
              className="mt-2 border-t border-gray-100 pt-2"
              role="group"
              aria-labelledby="local-support-heading"
            >
              <span
                id="local-support-heading"
                className="px-3 text-xs font-semibold uppercase tracking-wider text-text-dark"
              >
                Local Support
              </span>
              {CONNECT_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'min-h-[44px] flex items-center rounded-md px-3 pl-6 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-primary/5 text-primary'
                        : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Auth actions */}
            <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
              <Link
                to="/login"
                onClick={onClose}
                className={cn(
                  'relative min-h-[44px] flex items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  "after:absolute after:bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
                  'text-text-dark hover:text-primary after:scale-x-0 hover:after:scale-x-100'
                )}
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="min-h-[44px] flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
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
        transparent ? 'fixed inset-x-0 bg-transparent' : 'sticky bg-neutral-bg'
      )}
      aria-label="Main navigation"
    >
      <div className={cn(
        'mx-auto max-w-6xl px-4 pb-2 sm:px-6',
        transparent ? 'pt-5' : 'pt-3'
      )}>
        <div
          className={cn(
            'rounded-2xl',
            transparent
              ? 'bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25'
              : 'bg-white shadow-md'
          )}
        >
          <div className="flex items-center justify-between px-6 py-3">
            <NavbarLogo transparent={transparent} />
            <DesktopNav transparent={transparent} />
            <DesktopAuthActions transparent={transparent} />

            {/* Hamburger button — visible below lg */}
            <button
              ref={hamburgerRef}
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden',
                transparent
                  ? 'text-white hover:bg-white/10 hover:text-white'
                  : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
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

          <MobileDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
      </div>
    </nav>
  )
}
