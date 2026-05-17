// Spec 7.7 — Visibility tier copy. Anti-pressure reviewed (Universal Rule 11/12):
// - No scarcity ("limited people can see this")
// - No pressure toward any tier ("share with the community" / "keep it safe")
// - No commercial language
// - Factual, neutral, calm
// All strings are i18n-ready as a constants object; future i18n spec can swap
// the values for an i18n key lookup without changing the consumer.

import { Globe, Lock, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type PostVisibility = 'public' | 'friends' | 'private'

export interface VisibilityOption {
  value: PostVisibility
  label: string
  tooltip: string
  icon: LucideIcon
}

export const VISIBILITY_OPTIONS: ReadonlyArray<VisibilityOption> = [
  {
    value: 'public',
    label: 'Public',
    tooltip: 'Anyone on Worship Room can see this prayer.',
    icon: Globe,
  },
  {
    value: 'friends',
    label: 'Friends',
    tooltip: "Only people you've added as friends will see this prayer.",
    icon: Users,
  },
  {
    value: 'private',
    label: 'Private',
    tooltip: 'Only you can see this prayer. Useful for journaling-style prayers.',
    icon: Lock,
  },
] as const

export const DEFAULT_VISIBILITY: PostVisibility = 'public'
