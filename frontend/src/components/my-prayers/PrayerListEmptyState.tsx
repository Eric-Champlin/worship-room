import { Heart } from 'lucide-react'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'

interface PrayerListEmptyStateProps {
  onAddPrayer: () => void
}

export function PrayerListEmptyState({ onAddPrayer }: PrayerListEmptyStateProps) {
  return (
    <FeatureEmptyState
      icon={Heart}
      heading="Your prayer list is waiting."
      description="Bring what's on your heart. God is already listening."
      ctaLabel="Add a prayer"
      onCtaClick={onAddPrayer}
    />
  )
}
