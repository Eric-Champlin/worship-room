import { Bookmark } from 'lucide-react'
import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore'
import { removeCard, recordReview } from '@/lib/memorize'
import { timeAgo } from '@/lib/time'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { MemorizationFlipCard } from './MemorizationFlipCard'

export function MemorizationDeck() {
  const cards = useMemorizationStore()

  if (cards.length === 0) {
    return (
      <FeatureEmptyState
        icon={Bookmark}
        heading="No memorization cards yet"
        description="Tap the memorize action on any verse in the Bible reader to start your deck."
        ctaLabel="Open the reader"
        ctaHref="/bible"
      />
    )
  }

  // Find most recently reviewed card
  const lastReviewed = cards
    .filter((c) => c.lastReviewedAt !== null)
    .sort((a, b) => (b.lastReviewedAt ?? 0) - (a.lastReviewedAt ?? 0))[0]

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Memorization deck</h2>

      <p className="mt-1 text-sm text-white/60">
        {cards.length} {cards.length === 1 ? 'card' : 'cards'} in your deck
      </p>
      {lastReviewed && (
        <p className="mt-0.5 text-sm text-white/60">
          Last reviewed {lastReviewed.reference}{' '}
          {timeAgo(new Date(lastReviewed.lastReviewedAt!).toISOString())}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <MemorizationFlipCard
            key={card.id}
            card={card}
            onRemove={removeCard}
            onReview={recordReview}
          />
        ))}
      </div>
    </div>
  )
}
