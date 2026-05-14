import type { ReactNode } from 'react'
import { PrayerCard } from './PrayerCard'
import type { PrayerRequest } from '@/types/prayer-wall'
import type { PrayerCategory } from '@/constants/prayer-categories'

interface AnsweredCardProps {
  prayer: PrayerRequest
  showFull?: boolean
  onCategoryClick?: (category: PrayerCategory) => void
  children?: ReactNode
  index?: number
  tier?: 'feed' | 'detail'
  /** Spec 6.6b — author affordance callbacks. Pass through to PrayerCard;
   *  only the author of the post will see the affordances (PrayerCard checks
   *  ownership). Pass nothing on non-authored surfaces. */
  onUnmark?: () => void
  onEditAnsweredText?: (text: string) => void
}

/**
 * Spec 6.6 — Answered Wall card variant. Thin wrapper around {@link PrayerCard}
 * that sets `answeredVariant` so the small inline AnsweredBadge is replaced
 * with the prominent "How this was answered" region. Gate-G-CARD-NO-FORK:
 * AnsweredCard adds no internals of its own and never duplicates PrayerCard
 * JSX — extension via prop, not via fork.
 *
 * Caller supplies the InteractionBar (with `showPraising={true}`) via children.
 *
 * Spec 6.6b — also passes through the new author affordance callbacks
 * (`onUnmark`, `onEditAnsweredText`); PrayerCard renders them only for the
 * post's author.
 */
export function AnsweredCard(props: AnsweredCardProps) {
  return <PrayerCard {...props} answeredVariant />
}
