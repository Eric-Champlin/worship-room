import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Book, Calendar, Heart, Menu, Music, TrendingUp, WifiOff, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { LocalSupportDropdown } from '@/components/LocalSupportDropdown'
import { MobileDrawer, MobileNotificationSheet } from '@/components/MobileDrawer'
import { DesktopUserActions } from '@/components/DesktopUserActions'
import { SeasonalBanner } from '@/components/SeasonalBanner'

const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon: LucideIcon }> = [
  { label: 'Daily Hub', to: '/daily', icon: Calendar },
  { label: 'Study Bible', to: '/bible', icon: Book },
  { label: 'Grow', to: '/grow', icon: TrendingUp },
  { label: 'Music', to: '/music', icon: Music },
  { label: 'Prayer Wall', to: '/prayer-wall', icon: Heart },
]

// eslint-disable-next-line react-refresh/only-export-components -- Utility co-located with Navbar for route matching
export function isNavActive(to: string, pathname: string): boolean {
  switch (to) {
    case '/daily': return pathname.startsWith('/daily') || pathname.startsWith('/meditate')
    case '/bible': return pathname.startsWith('/bible')
    case '/grow': return pathname === '/grow' || pathname.startsWith('/reading-plans/') || pathname.startsWith('/challenges/')
    case '/prayer-wall': return pathname.startsWith('/prayer-wall')
    case '/music': return pathname.startsWith('/music')
    default: return pathname === to
  }
}

function getNavLinkClass(transparent: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
      "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-base after:ease-decelerate after:origin-center after:content-[''] motion-reduce:after:transition-none",
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
    <Link to="/" className="flex items-center gap-1.5" aria-label="Worship Room home">
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

function DesktopNav({ transparent }: { transparent: boolean }) {
  const location = useLocation()

  return (
    <div className="hidden items-center gap-4 md:gap-6 md:flex">
      {NAV_LINKS.map((link) => {
        const active = isNavActive(link.to, location.pathname)
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={getNavLinkClass(transparent)({ isActive: active })}
            aria-label={link.label}
            title={link.label}
          >
            <link.icon size={18} className="hidden md:block lg:hidden" aria-hidden="true" />
            <span className="hidden lg:inline">{link.label}</span>
          </NavLink>
        )
      })}
      <LocalSupportDropdown transparent={transparent} />
    </div>
  )
}

function DesktopAuthActions({ transparent }: { transparent: boolean }) {
  const authModal = useAuthModal()
  const { isOnline } = useOnlineStatus()
  return (
    <div className="hidden items-center gap-4 md:flex">
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
          "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-base after:ease-decelerate after:origin-center after:content-[''] motion-reduce:after:transition-none",
          transparent ? 'after:bg-white' : 'after:bg-primary',
          transparent
            ? 'text-white/90 hover:text-white after:scale-x-0 hover:after:scale-x-100'
            : 'text-text-dark hover:text-primary after:scale-x-0 hover:after:scale-x-100'
        )}
      >
        Log In
      </button>
      <Link
        to="/register"
        className={cn(
          'inline-flex items-center rounded-full px-5 py-2 text-sm font-medium text-white transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
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

interface NavbarProps {
  transparent?: boolean
  hideBanner?: boolean
}

export function Navbar({ transparent = false, hideBanner = false }: NavbarProps) {
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
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
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
                'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden',
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

        {!hideBanner && <SeasonalBanner />}
      </div>

      {/* Mobile notification bottom sheet — auth-gated to prevent localStorage writes for logged-out users */}
      {isAuthenticated && (
        <MobileNotificationSheet
          isOpen={isMobileBellOpen}
          onClose={() => setIsMobileBellOpen(false)}
        />
      )}
    </nav>
    </>
  )
}
