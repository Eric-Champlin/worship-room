import { useEffect, useRef, useState, useCallback } from 'react'
import { Copy, Mail, MessageSquare, Check } from 'lucide-react'

interface ShareDropdownProps {
  prayerId: string
  prayerContent: string
  isOpen: boolean
  onClose: () => void
}

export function getShareText(content: string): string {
  return `Please pray with me — ${content.slice(0, 100)}${content.length > 100 ? '...' : ''} — Worship Room Prayer Wall`
}

export function ShareDropdown({
  prayerId,
  prayerContent,
  isOpen,
  onClose,
}: ShareDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/prayer-wall/${prayerId}`
  const shareText = getShareText(prayerContent)

  const getItems = useCallback((): HTMLElement[] => {
    if (!dropdownRef.current) return []
    return Array.from(
      dropdownRef.current.querySelectorAll<HTMLElement>('button, a'),
    )
  }, [])

  useEffect(() => {
    if (!isOpen) return

    triggerRef.current = document.activeElement as HTMLElement | null

    // Focus first item when dropdown opens
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

  // Cleanup copy timeout on unmount
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
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: do nothing if clipboard API not available
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(shareText)

  const itemClass =
    'flex w-full items-center gap-3 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Share options"
      className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={handleCopyLink}
        className={itemClass}
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? 'Copied!' : 'Copy link'}
      </button>

      <a
        href={`mailto:?subject=${encodeURIComponent('Prayer Request')}&body=${encodedText}%0A%0A${encodedUrl}`}
        role="menuitem"
        tabIndex={-1}
        className={itemClass}
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        Email
      </a>

      <a
        href={`sms:?body=${encodedText}%20${encodedUrl}`}
        role="menuitem"
        tabIndex={-1}
        className={`${itemClass} sm:hidden`}
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        SMS
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
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
        href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
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
