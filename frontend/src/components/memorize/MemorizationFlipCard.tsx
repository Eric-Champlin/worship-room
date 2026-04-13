import { useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { timeAgo } from '@/lib/time'
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleFlip()
    }
  }

  const dateAdded = timeAgo(new Date(card.createdAt).toISOString())

  const footer = (
    <CardFooter
      card={card}
      dateAdded={dateAdded}
      confirmingRemove={confirmingRemove}
      onStartRemove={(e) => {
        e.stopPropagation()
        setConfirmingRemove(true)
      }}
      onConfirmRemove={(e) => {
        e.stopPropagation()
        onRemove(card.id)
        setConfirmingRemove(false)
      }}
      onCancelRemove={(e) => {
        e.stopPropagation()
        setConfirmingRemove(false)
      }}
    />
  )

  return (
    <div className="h-[180px]" style={{ perspective: '1000px' }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={
          flipped
            ? 'Flip card to show reference'
            : 'Flip card to reveal verse text'
        }
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        className="relative h-full w-full transition-transform duration-300 ease-out motion-reduce:duration-0"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 flex flex-col"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xl font-semibold text-white text-center">
              {card.reference}
            </span>
          </div>
          <RotateCcw
            size={14}
            className="absolute top-3 right-3 text-white/30"
            aria-hidden="true"
          />
          {footer}
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] p-4 flex flex-col"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="flex-1 overflow-y-auto">
            <p className="text-[15px] text-white/90 leading-relaxed font-serif">
              {card.verseText}
            </p>
          </div>
          {footer}
        </div>
      </div>
    </div>
  )
}

function CardFooter({
  card,
  dateAdded,
  confirmingRemove,
  onStartRemove,
  onConfirmRemove,
  onCancelRemove,
}: {
  card: MemorizationCard
  dateAdded: string
  confirmingRemove: boolean
  onStartRemove: (e: React.MouseEvent) => void
  onConfirmRemove: (e: React.MouseEvent) => void
  onCancelRemove: (e: React.MouseEvent) => void
}) {
  if (confirmingRemove) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-white/[0.08] px-3 py-2 mt-2">
        <span className="text-xs text-white/70">Remove this card?</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirmRemove}
            className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-1 text-xs font-medium text-red-400 hover:bg-white/[0.06] transition-colors"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={onCancelRemove}
            className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-1 text-xs font-medium text-white/60 hover:bg-white/[0.06] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs text-white/50">Added {dateAdded}</span>
      <button
        type="button"
        onClick={onStartRemove}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 transition-colors"
        aria-label={`Remove ${card.reference} from memorization deck`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
