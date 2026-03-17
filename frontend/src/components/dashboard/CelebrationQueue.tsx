import { useCelebrationQueue } from '@/hooks/useCelebrationQueue'
import { CelebrationOverlay } from './CelebrationOverlay'

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

  return (
    <CelebrationOverlay
      badge={currentCelebration.badge}
      onDismiss={dismissCurrent}
    />
  )
}
