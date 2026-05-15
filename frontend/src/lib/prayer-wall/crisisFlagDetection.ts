import type { PostDto } from '@/types/api/prayer-wall'

/**
 * Spec 6.11b — Gate-G-CRISIS-SUPPRESSION.
 *
 * Returns true if ANY post in the array has `crisisFlag: true`. Used by
 * pages that mount the PresenceIndicator to decide whether to render it
 * at all. All-or-nothing per page: a single flagged post suppresses the
 * indicator across the whole route.
 *
 * <p>This helper reads the RAW PostDto (which carries `crisisFlag`),
 * NOT the mapped PrayerRequest (where the mapper deliberately drops the
 * field per Phase 3 Addendum #7). Consumers must call this on the raw
 * API response BEFORE invoking `mapPostDtos`.
 *
 * @see _specs/forums/spec-6-11b.md Section 4 — The Crisis-Flagged Page Suppression
 * @see frontend/src/lib/prayer-wall/postMappers.ts — mapper preserved
 */
export function hasAnyCrisisFlag(rawDtos: PostDto[] | null | undefined): boolean {
  if (!rawDtos || rawDtos.length === 0) return false
  return rawDtos.some((dto) => dto.crisisFlag === true)
}

/** Single-post variant for routes like PrayerDetail. */
export function isCrisisFlagged(rawDto: PostDto | null | undefined): boolean {
  return rawDto?.crisisFlag === true
}
