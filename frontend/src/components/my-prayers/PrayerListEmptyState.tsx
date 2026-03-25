import { BookHeart, Plus } from 'lucide-react'

interface PrayerListEmptyStateProps {
  onAddPrayer: () => void
}

export function PrayerListEmptyState({ onAddPrayer }: PrayerListEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BookHeart className="mb-4 h-16 w-16 text-text-light/30" aria-hidden="true" />
      <h2 className="mb-2 text-xl font-semibold text-text-dark">
        Your prayer list is empty
      </h2>
      <p className="mb-6 text-text-light">
        Start tracking what&apos;s on your heart
      </p>
      <button
        type="button"
        onClick={onAddPrayer}
        className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        Add Prayer
      </button>
    </div>
  )
}
