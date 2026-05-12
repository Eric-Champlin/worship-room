import { getTodaysVerse } from '@/constants/prayer-receipt-verses'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'

/**
 * Spec 6.1 — Dashboard mini-receipt (D-Dashboard-mini / Gate-32 defense in depth).
 *
 * Surfaces on each own-post card on `/prayer-wall/dashboard`. Count + daily
 * scripture verse REFERENCE only — NO avatars, NO friend names, NO modal.
 *
 * The full `<PrayerReceipt>` is the canonical surface for the per-post view;
 * the mini is intentionally simpler so the dashboard list doesn't fire 1 fetch
 * per post (no API call from this component — count comes from the parent
 * post's `prayingCount`).
 */
export interface PrayerReceiptMiniProps {
  postAuthorId: string
  prayingCount: number
}

export function PrayerReceiptMini({
  postAuthorId,
  prayingCount,
}: PrayerReceiptMiniProps) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const isAuthor = user?.id === postAuthorId
  const settingVisible = settings.prayerWall.prayerReceiptsVisible

  if (!isAuthor || prayingCount === 0 || !settingVisible) return null

  const verse = getTodaysVerse()
  // Copy Deck verbatim (Gate-34) — matches the per-post PrayerReceipt count
  // text exactly. Earlier drafts truncated "for you" to save horizontal space;
  // the dashboard column is wide enough at all breakpoints (verified via
  // `truncate` on the verse reference, not the count text).
  const countText =
    prayingCount === 1
      ? '1 person is praying for you'
      : `${prayingCount} people are praying for you`

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70"
      data-testid="prayer-receipt-mini"
    >
      <span>{countText}</span>
      <span className="text-white/40" aria-hidden="true">
        •
      </span>
      <span className="font-serif italic text-white/60 truncate">
        {verse.reference}
      </span>
    </div>
  )
}
