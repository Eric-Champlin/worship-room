/**
 * BB-38: Pure validator for the ?action= query parameter.
 *
 * Returns the value iff it's in the deep-linkable subset, else null.
 * Deep-linkable actions are those with a sub-view that mounts inside the
 * VerseActionSheet. Excludes:
 *   - bookmark: toggles without a sub-view (hasSubView: false)
 *   - pray/journal/meditate: navigate away from the reader to /daily
 *   - copy/copy-with-ref: side-effect actions with no sub-view
 */

import type { VerseAction } from '@/types/verse-actions'
import { getActionByType } from '@/lib/bible/verseActionRegistry'

export const DEEP_LINKABLE_ACTIONS = [
  'explain',
  'reflect',
  'cross-refs',
  'note',
  'highlight',
  'share',
  'memorize',
] as const satisfies readonly VerseAction[]

export type DeepLinkableAction = (typeof DEEP_LINKABLE_ACTIONS)[number]

const DEEP_LINKABLE_SET: ReadonlySet<string> = new Set(DEEP_LINKABLE_ACTIONS)

/**
 * Returns the value iff it's a deep-linkable action, else null.
 *
 * Defense-in-depth: also verifies the action exists in the registry and
 * actually has `hasSubView: true`. This catches any future registry drift
 * where an action is removed or loses its sub-view without updating the
 * allowlist above.
 */
export function validateAction(value: string | null): DeepLinkableAction | null {
  if (value === null || value === '') return null
  if (!DEEP_LINKABLE_SET.has(value)) return null
  const handler = getActionByType(value as VerseAction)
  if (!handler) return null
  if (!handler.hasSubView) return null
  return value as DeepLinkableAction
}
