import { useEffect } from 'react'
import { useCelebrationQueue } from '@/hooks/useCelebrationQueue'
import { CelebrationOverlay } from './CelebrationOverlay'
import { getBadgeSuggestion } from '@/lib/badge-suggestion'
import { useSoundEffects } from '@/hooks/useSoundEffects'

interface CelebrationQueueProps {
  newlyEarnedBadges: string[]
  clearNewlyEarnedBadges: () => void
}

export function CelebrationQueue({
  newlyEarnedBadges,
  clearNewlyEarnedBadges,
}: CelebrationQueueProps) {
  const { playSoundEffect } = useSoundEffects()
  const { currentCelebration, celebrationType, dismissCurrent } = useCelebrationQueue({
    newlyEarnedBadges,
    clearNewlyEarnedBadges,
    onPlaySound: playSoundEffect,
  })

  // Listen for faith points / level up events
  useEffect(() => {
    const handlePointsEarned = () => playSoundEffect('sparkle')
    const handleLevelUp = () => playSoundEffect('ascending')
    window.addEventListener('wr:points-earned', handlePointsEarned)
    window.addEventListener('wr:level-up', handleLevelUp)
    return () => {
      window.removeEventListener('wr:points-earned', handlePointsEarned)
      window.removeEventListener('wr:level-up', handleLevelUp)
    }
  }, [playSoundEffect])

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
