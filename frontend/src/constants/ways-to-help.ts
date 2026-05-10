import { Utensils, Car, ShoppingBag, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type HelpTag = 'meals' | 'rides' | 'errands' | 'visits' | 'just_prayer'

/** Canonical sort order — must match backend HelpTag enum declaration order. */
export const HELP_TAG_ORDER: HelpTag[] = [
  'meals',
  'rides',
  'errands',
  'visits',
  'just_prayer',
]

export const HELP_TAG_LABELS: Record<HelpTag, string> = {
  meals: 'Meals',
  rides: 'Rides',
  errands: 'Errands',
  visits: 'Visits',
  just_prayer: 'Just prayer, please',
}

/** Icons for the 4 displayable tags. just_prayer never renders as a pill (D8). */
export const HELP_TAG_ICONS: Record<Exclude<HelpTag, 'just_prayer'>, LucideIcon> = {
  meals: Utensils,
  rides: Car,
  errands: ShoppingBag,
  visits: Home,
}

/** Tags that render as pills on cards. just_prayer is a positive signal (D6) but never displayed. */
export const DISPLAYABLE_TAGS: HelpTag[] = HELP_TAG_ORDER.filter(
  (t) => t !== 'just_prayer',
)

/** Type guard for narrowing to displayable tags. */
export function isDisplayableTag(
  tag: HelpTag,
): tag is Exclude<HelpTag, 'just_prayer'> {
  return tag !== 'just_prayer'
}

/** Composer helper text — anti-pressure, permission-giving (Section 13). */
export const WAYS_TO_HELP_PICKER_LABEL = 'What would help?'
export const WAYS_TO_HELP_HELPER_TEXT =
  'Optional — leave blank if prayer is what you need right now.'
