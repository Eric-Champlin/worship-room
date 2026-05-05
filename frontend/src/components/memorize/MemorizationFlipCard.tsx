import { useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { timeAgo } from '@/lib/time'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import type { MemorizationCard } from '@/types/memorize'

interface MemorizationFlipCardProps {
  card: MemorizationCard
  onRemove: (id: string) => void
  onReview: (id: string) => void
}

export function MemorizationFlipCard({
  card,
  onRemove,
  onReview,
}: MemorizationFlipCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const handleFlip = () => {
    setFlipped((prev) => {
      const next = !prev
      // Record review when revealing verse text (front → back).
      // Deferred via queueMicrotask to avoid updating the store (and
      // triggering MemorizationDeck re-render) inside React's render phase.
      if (next) {
        queueMicrotask(() => onReview(card.id))
      }
      return next
    })
  }

  const dateAdded = timeAgo(new Date(card.createdAt).toISOString())

  return (
    <div className="relative h-[180px]" style={{ perspective: '1000px' }}>
      <button
        type="button"
        onClick={handleFlip}
        aria-label={
          flipped
            ? 'Flip card to show reference'
            : 'Flip card to reveal verse text'
        }
        aria-pressed={flipped}
        className="relative block h-full w-full rounded-2xl transition-transform motion-reduce:transition-none duration-base ease-decelerate motion-reduce:duration-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <FrostedCard
          className="absolute inset-0 flex flex-col rounded-2xl !p-4"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="flex flex-1 items-center justify-center">
            <span className="text-center text-xl font-semibold text-white">
              {card.reference}
            </span>
          </div>
          <RotateCcw
            size={14}
            className="absolute right-3 top-3 text-white/50"
            aria-hidden="true"
          />
          <span className="absolute bottom-3 left-3 text-xs text-white/50">
            Added {dateAdded}
          </span>
        </FrostedCard>

        {/* Back face */}
        <FrostedCard
          className="absolute inset-0 flex flex-col rounded-2xl !p-4"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="flex-1 overflow-y-auto pr-1">
            <p className="font-serif text-[15px] leading-relaxed text-white/90">
              {card.verseText}
            </p>
          </div>
          <span className="absolute bottom-3 left-3 text-xs text-white/50">
            Added {dateAdded}
          </span>
        </FrostedCard>
      </button>

      {/* Remove control — sibling of the flip button (avoids nested-button HTML).
          Stays anchored in screen position regardless of flip state. */}
      <div className="absolute bottom-2 right-2 z-10">
        {confirmingRemove ? (
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.10] px-2 py-1 backdrop-blur-sm">
            <span className="text-xs text-white/70">Remove?</span>
            <button
              type="button"
              onClick={() => {
                onRemove(card.id)
                setConfirmingRemove(false)
              }}
              className="min-h-[44px] min-w-[44px] rounded-lg px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-white/[0.06]"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRemove(false)}
              className="min-h-[44px] min-w-[44px] rounded-lg px-2 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            aria-label={`Remove ${card.reference} from memorization deck`}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
