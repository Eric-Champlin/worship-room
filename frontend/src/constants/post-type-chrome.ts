import type { PostType } from '@/constants/post-types'

/**
 * Per-type accent layer for Prayer Wall cards. Layered on top of
 * `<FrostedCard variant="default">` via the `className` prop. Provides ONLY
 * the border tint and background tint; the frosted glass base chrome
 * (rounded-3xl, backdrop-blur, default surface opacity) is provided by
 * FrostedCard itself.
 *
 * Lifted verbatim from PrayerCard.tsx's per-type switch (Spec 5.1, 2026-05-11).
 * Opacities are NOT to be normalized — per Spec 5.1 W8, the migration preserves
 * the per-type accent opacity values exactly as they were in the inline switch.
 */
export const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',
  testimony: 'border-amber-200/10 bg-amber-500/[0.04]',
  question: 'border-cyan-200/10 bg-cyan-500/[0.04]',
  discussion: 'border-violet-200/10 bg-violet-500/[0.04]',
  encouragement: 'border-rose-200/10 bg-rose-500/[0.04]',
}

export function getPerTypeChromeClass(postType: PostType): string {
  return PER_TYPE_CHROME[postType]
}
