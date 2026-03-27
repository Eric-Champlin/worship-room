import { useCelebrationQueue } from '@/hooks/useCelebrationQueue'
import { CelebrationOverlay } from './CelebrationOverlay'
import { getBadgeSuggestion } from '@/lib/badge-suggestion'

interface CelebrationQueueProps {
  newlyEarnedBadges: string[]
  clearNewlyEarnedBadges: () => void
}

export function CelebrationQueue({
  newlyEarnedBadges,
  clearNewlyEarnedBadges,
}: CelebrationQueueProps) {
  const { currentCelebration, celebrationType, dismissCurrent } = useCelebrationQueue({
    newlyEarnedBadges,
    clearNewlyEarnedBadges,
  })

  if (celebrationType !== 'overlay' || !currentCelebration) {
    return null
  }

  const suggestion = getBadgeSuggestion(currentCelebration.badgeId, currentCelebration.badge.category) ?? undefined

  return (
    <CelebrationOverlay
      badge={currentCelebration.badge}
      onDismiss={dismissCurrent}
      suggestion={suggestion}
    />
  )
}
