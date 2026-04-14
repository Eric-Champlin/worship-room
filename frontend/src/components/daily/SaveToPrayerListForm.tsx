import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CrisisBanner } from './CrisisBanner'
import { addPrayer } from '@/services/prayer-list-storage'
import { PRAYER_CATEGORIES, CATEGORY_LABELS } from '@/constants/prayer-categories'
import { useToast } from '@/components/ui/Toast'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerVerseContext } from '@/types/daily-experience'

interface SaveToPrayerListFormProps {
  topicText: string
  prayerText: string
  onSave: () => void
  onCancel: () => void
  verseContext?: PrayerVerseContext | null
}

function extractDefaultTitle(topicText: string): string {
  if (!topicText.trim()) return 'My prayer'
  const words = topicText.trim().split(/\s+/).slice(0, 8).join(' ')
  if (words.length <= 3) return 'My prayer'
  return words.length > 100 ? words.slice(0, 100) : words
}

export function SaveToPrayerListForm({
  topicText,
  prayerText,
  onSave,
  onCancel,
  verseContext,
}: SaveToPrayerListFormProps) {
  const [title, setTitle] = useState(() => extractDefaultTitle(topicText))
  const [category, setCategory] = useState<PrayerCategory | null>(null)
  const { showToast } = useToast()

  const handleSave = useCallback(() => {
    if (!category) return

    const result = addPrayer({
      title: title.trim() || 'My prayer',
      description: prayerText,
      category,
      verseContext: verseContext ?? undefined,
    })

    if (!result) {
      showToast(
        "You've reached the 200 prayer limit. Consider archiving answered prayers to make room.",
        'error',
      )
      return
    }

    onSave()
  }, [title, category, prayerText, onSave, showToast, verseContext])

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-text-dark">
        Save to your prayer list
      </h4>

      <label htmlFor="save-prayer-title" className="mb-1 block text-xs text-text-light">
        Title
      </label>
      <input
        id="save-prayer-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        className="mb-2 w-full rounded border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Prayer title"
      />

      <CrisisBanner text={title} />

      <p className="mb-2 mt-3 text-xs text-text-light">Category</p>
      <div className="flex flex-wrap gap-2 overflow-x-auto sm:overflow-visible">
        {PRAYER_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full px-3 py-1.5 text-xs transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]',
              category === cat
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!category}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-semibold text-white transition-[colors,transform] duration-fast active:scale-[0.98]',
            category
              ? 'bg-primary hover:bg-primary-lt'
              : 'cursor-not-allowed bg-gray-300',
          )}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-text-light hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
