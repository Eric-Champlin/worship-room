import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const LOCAL_SUPPORT_LINKS = [
  { label: 'Churches', to: '/local-support/churches' },
  { label: 'Counselors', to: '/local-support/counselors' },
  { label: 'Celebrate Recovery', to: '/local-support/celebrate-recovery' },
] as const

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

export function LocalSupportDropdown({ transparent }: { transparent: boolean }) {
  return (
    <NavDropdown
      label="Local Support"
      to="/local-support/churches"
      links={LOCAL_SUPPORT_LINKS}
      dropdownId="local-support-dropdown"
      transparent={transparent}
    />
  )
}
