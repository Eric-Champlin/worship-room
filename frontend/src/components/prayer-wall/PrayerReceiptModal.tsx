import { useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

import type { AttributedIntercessor } from '@/types/prayer-receipt'

/**
 * Spec 6.1 — Prayer Receipt modal listing intercessors.
 *
 * Pattern matches `AuthModal.tsx` (canonical project modal):
 *   - role="dialog" + aria-modal="true" + labelled-by the title element
 *   - useFocusTrap() — first focusable element receives focus on open;
 *     Tab cycles within the modal; Escape closes; previous focus restored
 *     on unmount.
 *   - No timestamps (privacy — Spec 6.1 § Substack 6)
 *   - Friends rendered by displayName; non-friends as "A friend" rows
 *
 * Listbox semantics (W38 / master plan AC "arrow keys navigate"):
 *   - The intercessor list is an ARIA listbox with roving tabindex.
 *   - ArrowDown / ArrowUp move between options (wrapping at ends).
 *   - Home / End jump to first / last option.
 *   - The list is one Tab stop; tabbing in lands on the currently-active option.
 *
 * Privacy invariant (Gate-32 defense in depth): we render only
 * `attributedIntercessors` (friends) and `anonymousCount` (a count, no
 * identity). Non-friend user_ids are never on the wire and never in DOM.
 */
export interface PrayerReceiptModalProps {
  attributedIntercessors: AttributedIntercessor[]
  anonymousCount: number
  totalCount: number
  onClose: () => void
}

const TITLE_ID = 'prayer-receipt-modal-title'
const MAX_VISIBLE_ROWS = 10

export function PrayerReceiptModal({
  attributedIntercessors,
  anonymousCount,
  totalCount,
  onClose,
}: PrayerReceiptModalProps) {
  const containerRef = useFocusTrap(true, onClose)

  const visibleFriends = attributedIntercessors.slice(0, MAX_VISIBLE_ROWS)
  const visibleAnonRows = Math.max(
    0,
    Math.min(anonymousCount, MAX_VISIBLE_ROWS - visibleFriends.length),
  )
  const overflow =
    totalCount - visibleFriends.length - visibleAnonRows

  const navigableCount = visibleFriends.length + visibleAnonRows
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  const focusAt = useCallback((index: number) => {
    setActiveIndex(index)
    itemRefs.current[index]?.focus()
  }, [])

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (navigableCount === 0) return
      let next: number | null = null
      switch (e.key) {
        case 'ArrowDown':
          next = (activeIndex + 1) % navigableCount
          break
        case 'ArrowUp':
          next = (activeIndex - 1 + navigableCount) % navigableCount
          break
        case 'Home':
          next = 0
          break
        case 'End':
          next = navigableCount - 1
          break
        default:
          return
      }
      if (next !== null) {
        e.preventDefault()
        focusAt(next)
      }
    },
    [activeIndex, navigableCount, focusAt],
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={cn(
          'relative w-full max-w-md rounded-3xl border border-violet-400/40',
          'bg-hero-bg shadow-frosted-accent p-6 text-white',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
          data-testid="prayer-receipt-modal-close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2
          id={TITLE_ID}
          className="pr-10 text-xl font-semibold text-white"
        >
          Your prayer circle today
        </h2>
        <p className="mt-1 text-sm text-white/70">
          {totalCount === 1
            ? '1 person is praying for you'
            : `${totalCount} people are praying for you`}
        </p>

        <ul
          role="listbox"
          aria-label="Intercessors"
          onKeyDown={onListKeyDown}
          className="mt-5 space-y-1 max-h-[60vh] overflow-y-auto focus-visible:outline-none"
          data-testid="prayer-receipt-modal-list"
        >
          {visibleFriends.map((friend, i) => {
            const idx = i
            return (
              <li
                key={friend.userId}
                ref={(el) => {
                  itemRefs.current[idx] = el
                }}
                role="option"
                aria-selected={idx === activeIndex}
                tabIndex={idx === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(idx)}
                className="flex items-center justify-between rounded-md py-2 px-2 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-violet-400/60"
              >
                <span className="text-white">{friend.displayName}</span>
              </li>
            )
          })}
          {Array.from({ length: visibleAnonRows }).map((_, i) => {
            const idx = visibleFriends.length + i
            return (
              <li
                key={`anon-${i}`}
                ref={(el) => {
                  itemRefs.current[idx] = el
                }}
                role="option"
                aria-selected={idx === activeIndex}
                tabIndex={idx === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(idx)}
                className="flex items-center justify-between rounded-md py-2 px-2 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-violet-400/60"
                data-testid="prayer-receipt-modal-anon-row"
              >
                <span className="text-white/80">A friend</span>
              </li>
            )
          })}
          {overflow > 0 && (
            // Non-navigable presentational row — count summary, not an option.
            <li
              role="presentation"
              className="py-2 px-2 text-sm text-white/55"
              data-testid="prayer-receipt-modal-overflow"
            >
              …and {overflow} {overflow === 1 ? 'other' : 'others'}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
