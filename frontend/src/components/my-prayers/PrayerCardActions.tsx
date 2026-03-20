import { Heart, Pencil, CheckCircle, Trash2 } from 'lucide-react'
import type { PersonalPrayer } from '@/types/personal-prayer'

interface PrayerCardActionsProps {
  prayer: PersonalPrayer
  onPray: () => void
  onEdit: () => void
  onMarkAnswered: () => void
  onDelete: () => void
}

export function PrayerCardActions({
  prayer,
  onPray,
  onEdit,
  onMarkAnswered,
  onDelete,
}: PrayerCardActionsProps) {
  return (
    <div className="hidden items-center gap-2 pt-3 sm:flex">
      <button
        type="button"
        onClick={onPray}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 hover:text-primary-lt"
        aria-label="Pray for this"
        title="Pray for this"
      >
        <Heart className="h-5 w-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-light transition-colors hover:bg-gray-100 hover:text-text-dark"
        aria-label="Edit prayer"
        title="Edit"
      >
        <Pencil className="h-5 w-5" aria-hidden="true" />
      </button>

      {prayer.status === 'active' && (
        <button
          type="button"
          onClick={onMarkAnswered}
          className="flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-success transition-colors hover:bg-green-50 hover:text-green-700"
          aria-label="Mark as answered"
          title="Mark Answered"
        >
          <CheckCircle className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">Answered</span>
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-light transition-colors hover:bg-red-50 hover:text-danger"
        aria-label="Delete prayer"
        title="Delete"
      >
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}
