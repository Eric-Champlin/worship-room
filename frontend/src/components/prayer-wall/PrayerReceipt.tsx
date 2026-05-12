import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'

import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useToast } from '@/components/ui/Toast'
import { getTodaysVerse } from '@/constants/prayer-receipt-verses'
import { useAuth } from '@/hooks/useAuth'
import { usePrayerReceipt } from '@/hooks/usePrayerReceipt'
import { useSettings } from '@/hooks/useSettings'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { ApiError } from '@/types/auth'

import { PrayerReceiptImage } from './PrayerReceiptImage'
import { PrayerReceiptModal } from './PrayerReceiptModal'
import type { AttributedIntercessor } from '@/types/prayer-receipt'

/**
 * Spec 6.1 — Prayer Receipt.
 *
 * Mounted by PrayerCard on each prayer-wall post. The component renders
 * ONLY when ALL of the following are true (W30 defense in depth):
 *   1. viewer is the post author (`useAuth().user?.id === postAuthorId`)
 *   2. `prayingCount > 0`
 *   3. `settings.prayerWall.prayerReceiptsVisible !== false`
 *
 * Anti-pressure: hidden at zero (Gate-35) — no placeholder, no
 * "be the first to pray" copy.
 *
 * Privacy by construction: the hook is gated by `enabled`, so non-authors
 * NEVER fire the fetch. The server enforces the same gate (403 for non-authors).
 */
export interface PrayerReceiptProps {
  postId: string
  postAuthorId: string
  /**
   * Server-supplied count from the parent post (e.g. `prayer.prayingCount`).
   * Used for the early hidden-at-zero gate and the initial count rendering;
   * the receipt endpoint returns its own totalCount which takes precedence
   * once it lands.
   */
  prayingCount: number
  /**
   * First ~120 chars of the post content, rendered into the share-card PNG
   * (W34). When absent the PNG omits the excerpt — Step 16 wires the prop
   * from `prayer.content`.
   */
  postExcerpt?: string
}

const AVATAR_COLORS = [
  '#6D28D9',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#BE185D',
]

function avatarColorFor(seed: string): string {
  const hash = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initialOf(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

/**
 * Single intercessor avatar — friend (named, gradient-colored by displayName seed)
 * OR anonymous (deterministic generic gradient, no per-user color).
 */
function ReceiptAvatar({
  friend,
  ariaLabel,
  className,
}: {
  friend: AttributedIntercessor | null
  ariaLabel: string
  className?: string
}) {
  if (!friend) {
    // Generic non-friend avatar — single neutral gradient (D-Avatar: ONE generic non-friend avatar)
    return (
      <div
        aria-label={ariaLabel}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/30 to-white/10 ring-2 ring-hero-bg',
          className,
        )}
        data-testid="prayer-receipt-avatar-anonymous"
      >
        <span className="text-xs font-semibold text-white/70" aria-hidden="true">
          ·
        </span>
      </div>
    )
  }

  const initial = initialOf(friend.displayName)
  if (friend.avatarUrl) {
    return (
      <img
        src={friend.avatarUrl}
        alt={ariaLabel}
        className={cn(
          'h-8 w-8 rounded-full object-cover ring-2 ring-hero-bg',
          className,
        )}
        data-testid="prayer-receipt-avatar-friend"
      />
    )
  }
  return (
    <div
      aria-label={ariaLabel}
      role="img"
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white ring-2 ring-hero-bg',
        className,
      )}
      style={{ backgroundColor: avatarColorFor(friend.userId) }}
      data-testid="prayer-receipt-avatar-friend"
    >
      <span aria-hidden="true">{initial}</span>
    </div>
  )
}

export function PrayerReceipt({
  postId,
  postAuthorId,
  prayingCount,
  postExcerpt,
}: PrayerReceiptProps) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [shareCardMounted, setShareCardMounted] = useState(false)
  const [sharing, setSharing] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)

  const isAuthor = user?.id === postAuthorId
  const settingVisible = settings.prayerWall.prayerReceiptsVisible
  const enabled = isAuthor && prayingCount > 0 && settingVisible

  const { data } = usePrayerReceipt(postId, enabled)

  // Gate-35: hidden at zero, hidden when settings off, hidden for non-authors.
  // Defense in depth — the hook is also gated by `enabled`, so this branch
  // covers the "no fetch fires" case too.
  if (!enabled) return null

  // While the fetch is in flight we still show the count (from the parent's
  // prayingCount prop) but the avatar stack and modal stay empty.
  const effectiveCount = data?.totalCount ?? prayingCount
  const attributed = data?.attributedIntercessors ?? []
  const anonymousCount = data?.anonymousCount ?? 0

  const countText =
    effectiveCount === 1
      ? '1 person is praying for you'
      : `${effectiveCount} people are praying for you`

  // First 3 visible avatar slots. Fill with friends first; the rest are
  // anonymous (generic) slots. Always cap at 3 visible.
  const VISIBLE_SLOTS = 3
  const visibleFriends = attributed.slice(0, VISIBLE_SLOTS)
  const friendSlotsUsed = visibleFriends.length
  const remainingSlots = VISIBLE_SLOTS - friendSlotsUsed
  const anonymousSlots = Math.min(remainingSlots, anonymousCount)

  // Master plan AC: "Avatar stack has accessible names listing the first 3
  // intercessors." Build a comprehensive aria-label on the trigger button so
  // screen readers announce the first 3 intercessors (by name where the
  // viewer is a friend, "a friend" otherwise) AND the count AND the action.
  // The visual avatar stack itself stays aria-hidden — avoids double-announce.
  const buttonAriaLabel = (() => {
    const namedParts = visibleFriends.map((f) => f.displayName)
    if (anonymousSlots > 0) {
      const anonLabel =
        anonymousSlots === 1 ? 'a friend' : `${anonymousSlots} friends`
      namedParts.push(anonLabel)
    }
    const intro =
      namedParts.length > 0
        ? `${namedParts.join(', ')}. `
        : ''
    return `${intro}${countText}. Tap to see who is praying.`
  })()

  const verse = getTodaysVerse()

  /**
   * Step 15 — On-demand PNG share flow.
   *
   * 1. Call `POST /prayer-receipt/share` FIRST for rate-limit accounting.
   *    On 429 (soft block per OpenAPI contract — share UI does NOT fire),
   *    show a toast and return early. On other transport errors, log and
   *    proceed best-effort (the rate-limit endpoint is advisory).
   * 2. Mount the off-screen `<PrayerReceiptImage>` so html2canvas can paint it.
   * 3. Wait for `document.fonts.ready` so Lora italic is loaded (W33).
   * 4. Dynamic-import html2canvas to keep it OUT of the initial bundle (Gate-30).
   * 5. Capture to Blob; use Web Share API when available, else download fallback.
   * 6. Unmount the off-screen card.
   *
   * Ordering note: rate-limit check happens BEFORE the off-screen mount so a
   * 429 doesn't paint the share card unnecessarily.
   */
  async function handleShare() {
    if (sharing) return
    setSharing(true)
    try {
      // (1) Rate-limit accounting. The endpoint contract (openapi.yaml) treats
      // 429 as a soft block: surface a toast, do NOT fire the share UI. Other
      // transport errors are best-effort — the limit is advisory and a network
      // hiccup should not block the user from sharing.
      try {
        await apiFetch<void>(`/api/v1/posts/${postId}/prayer-receipt/share`, {
          method: 'POST',
        })
      } catch (e) {
        if (e instanceof ApiError && e.status === 429) {
          // 'warning' is the closest match in the project's ToastType union
          // ('success' | 'error' | 'warning'); the message is informational
          // rather than an outright error — the share simply isn't firing
          // right now and the user can try again later.
          showToast(
            "You've shared this prayer several times today. Please try again tomorrow.",
            'warning',
          )
          return
        }
        // Non-429: best-effort — proceed with share. The rate-limit endpoint
        // is advisory, not a hard gate on PNG generation (which is client-side).
      }

      // (2) Mount the off-screen share card AFTER the rate-limit clears.
      setShareCardMounted(true)

      // (3) Wait for the React commit + fonts to be ready BEFORE capture.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready
      }

      // (4) Dynamic import — keeps html2canvas out of the initial bundle (Gate-30).
      const { default: html2canvas } = await import('html2canvas')
      const node = shareCardRef.current
      if (!node) return

      const canvas = await html2canvas(node, {
        backgroundColor: null,
        scale: 2,
        // logging false — keep console clean in prod.
        logging: false,
      })

      // (5) Capture to Blob and share / download.
      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve()
            return
          }
          const file = new File([blob], 'prayer-receipt.png', { type: 'image/png' })
          // Web Share API path — mobile + supporting desktop browsers.
          const navAny = navigator as Navigator & {
            canShare?: (data: ShareData) => boolean
          }
          if (
            typeof navigator.share === 'function' &&
            navAny.canShare?.({ files: [file] })
          ) {
            navigator
              .share({ files: [file] })
              .catch(() => {
                // User cancelled or share failed — fall back silently.
              })
              .finally(() => resolve())
          } else {
            // Download fallback.
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'prayer-receipt.png'
            a.click()
            URL.revokeObjectURL(url)
            resolve()
          }
        }, 'image/png')
      })
    } finally {
      // (6) Always unmount the off-screen card and clear the in-flight flag.
      setShareCardMounted(false)
      setSharing(false)
    }
  }

  return (
    <>
      <FrostedCard
        variant="accent"
        className="mt-4"
        role="status"
        aria-label="Prayer receipt"
      >
        <div
          aria-live="polite"
          aria-atomic="true"
          data-testid="prayer-receipt"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label={buttonAriaLabel}
              className="flex items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
              data-testid="prayer-receipt-open-modal"
            >
              <div className="flex -space-x-2" aria-hidden="true">
                {visibleFriends.map((friend) => (
                  <ReceiptAvatar
                    key={friend.userId}
                    friend={friend}
                    ariaLabel={friend.displayName}
                  />
                ))}
                {Array.from({ length: anonymousSlots }).map((_, i) => (
                  <ReceiptAvatar
                    key={`anon-${i}`}
                    friend={null}
                    ariaLabel="A friend"
                  />
                ))}
              </div>
              <span className="text-base font-semibold text-white sm:text-lg" aria-hidden="true">
                {countText}
              </span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:opacity-60"
              aria-label="Share"
              data-testid="prayer-receipt-share"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <blockquote
            className="mt-3 font-serif italic text-white/80 text-[15px] sm:text-base leading-relaxed"
            data-testid="prayer-receipt-verse"
          >
            "{verse.text}"
            <cite className="mt-1 block text-sm not-italic text-white/55">
              — {verse.reference} (WEB)
            </cite>
          </blockquote>
        </div>
      </FrostedCard>

      {modalOpen && data && (
        <PrayerReceiptModal
          attributedIntercessors={data.attributedIntercessors}
          anonymousCount={data.anonymousCount}
          totalCount={data.totalCount}
          onClose={() => setModalOpen(false)}
        />
      )}

      {shareCardMounted && data && (
        <PrayerReceiptImage
          ref={shareCardRef}
          postExcerpt={(postExcerpt ?? '').slice(0, 120)}
          receipt={data}
          verse={verse}
        />
      )}
    </>
  )
}
