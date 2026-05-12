import type { PostType } from '@/constants/post-types'

/**
 * Per-type accent layer for Prayer Wall cards. Layered on top of
 * `<FrostedCard variant="default">` via the `className` prop. Provides
 * the per-type border and background tint at canonical Visual Rollout
 * opacities (/[0.12] borders, /[0.08] backgrounds).
 *
 * Spec 5.5 (2026-05-11) normalized these opacities from the deprecated
 * /[0.04] backgrounds and /10 borders that Spec 5.1 W8 preserved during
 * the FrostedCard migration. The 5.1 W8 directive ("opacities NOT to be
 * normalized") was a scoping decision specific to that migration and is
 * reversed here. Canonical opacities are documented in
 * .claude/rules/09-design-system.md § Deprecated Patterns.
 *
 * Per-type COLORS (amber for testimony, cyan for question, violet for
 * discussion, rose for encouragement) are intentional and not affected
 * by the opacity normalization.
 */
export const PER_TYPE_CHROME: Record<PostType, string> = {
  prayer_request: '',
  testimony: 'border-amber-200/[0.12] bg-amber-500/[0.08]',
  question: 'border-cyan-200/[0.12] bg-cyan-500/[0.08]',
  discussion: 'border-violet-200/[0.12] bg-violet-500/[0.08]',
  encouragement: 'border-rose-200/[0.12] bg-rose-500/[0.08]',
}

export function getPerTypeChromeClass(postType: PostType): string {
  return PER_TYPE_CHROME[postType]
}
