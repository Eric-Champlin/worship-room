import { useEffect, useRef, useState, useCallback } from 'react'
import { Copy, Mail, MessageSquare, Check } from 'lucide-react'
import { FACEBOOK_SHARE_BASE, TWITTER_SHARE_BASE } from '@/constants/sharing'
import { COPY_RESET_DELAY } from '@/constants/timing'
import type { LocalSupportCategory } from '@/types/local-support'

/**
 * Try native Web Share API. Returns true if share dialog was shown.
 * Callers should skip opening the dropdown if this returns true.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Utility co-located with ListingShareDropdown
export async function tryWebShare(placeName: string, category: LocalSupportCategory, placeId: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  const shareUrl = `${window.location.origin}/local-support/${category}?placeId=${placeId}`
  try {
    await navigator.share({
      title: placeName,
      text: `Check out ${placeName} on Worship Room`,
      url: shareUrl,
    })
    return true
  } catch (_e) {
    return false
  }
}

interface ListingShareDropdownProps {
  placeId: string
  placeName: string
  category: LocalSupportCategory
  isOpen: boolean
  onClose: () => void
}

export function ListingShareDropdown({
  placeId,
  placeName,
  category,
  isOpen,
  onClose,
}: ListingShareDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/local-support/${category}?placeId=${placeId}`
  const shareText = `Check out ${placeName} on Worship Room`

  const getItems = useCallback((): HTMLElement[] => {
    if (!dropdownRef.current) return []
    return Array.from(
      dropdownRef.current.querySelectorAll<HTMLElement>('button, a'),
    )
  }, [])

  useEffect(() => {
    if (!isOpen) return

    triggerRef.current = document.activeElement as HTMLElement | null

    requestAnimationFrame(() => {
      getItems()[0]?.focus()
    })

    function restoreFocus() {
      triggerRef.current?.focus()
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose()
        restoreFocus()
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        restoreFocus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, getItems])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = getItems()
      const currentIndex = items.indexOf(e.target as HTMLElement)
      if (currentIndex === -1) return

      let nextIndex: number | null = null
      if (e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % items.length
      } else if (e.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + items.length) % items.length
      } else if (e.key === 'Home') {
        nextIndex = 0
      } else if (e.key === 'End') {
        nextIndex = items.length - 1
      }

      if (nextIndex !== null) {
        e.preventDefault()
        items[nextIndex]?.focus()
      }
    },
    [getItems],
  )

  if (!isOpen) return null

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), COPY_RESET_DELAY)
    } catch (_e) {
      // Fallback: do nothing if clipboard API not available
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(shareText)

  const itemClass =
    'flex w-full items-center gap-2 px-4 py-2 text-sm text-white/80 transition-colors hover:text-white hover:bg-white/[0.05] focus-visible:outline-none focus-visible:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/40'

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Share options"
      className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-hero-mid/95 backdrop-blur-md border border-white/10 shadow-frosted-base py-2"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={handleCopyLink}
        aria-label={copied ? 'Link copied to clipboard' : 'Copy link'}
        className={itemClass}
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4 text-white/60" aria-hidden="true" />
        )}
        {copied ? 'Copied!' : 'Copy link'}
      </button>

      <a
        href={`mailto:?subject=${encodeURIComponent(`Check out ${placeName}`)}&body=${encodedText}%0A%0A${encodedUrl}`}
        role="menuitem"
        tabIndex={-1}
        className={itemClass}
      >
        <Mail className="h-4 w-4 text-white/60" aria-hidden="true" />
        Email
      </a>

      <a
        href={`sms:?body=${encodedText}%20${encodedUrl}`}
        role="menuitem"
        tabIndex={-1}
        className={`${itemClass} sm:hidden`}
      >
        <MessageSquare className="h-4 w-4 text-white/60" aria-hidden="true" />
        SMS
      </a>

      <a
        href={`${FACEBOOK_SHARE_BASE}?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        role="menuitem"
        tabIndex={-1}
        className={itemClass}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Facebook
      </a>

      <a
        href={`${TWITTER_SHARE_BASE}?text=${encodedText}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        role="menuitem"
        tabIndex={-1}
        className={itemClass}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X (Twitter)
      </a>
    </div>
  )
}
