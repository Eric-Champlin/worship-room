import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'
import type { PersonalPrayer } from '@/types/personal-prayer'

interface EditPrayerFormProps {
  prayer: PersonalPrayer
  onSave: (updates: { title: string; description: string; category: PrayerCategory }) => void
  onCancel: () => void
}

export function EditPrayerForm({ prayer, onSave, onCancel }: EditPrayerFormProps) {
  const [title, setTitle] = useState(prayer.title)
  const [description, setDescription] = useState(prayer.description)
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory>(prayer.category)
  const [showTitleError, setShowTitleError] = useState(false)

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      setShowTitleError(true)
      return
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
    })
  }, [title, description, selectedCategory, onSave])

  return (
    <article className="rounded-xl border border-primary/30 bg-white p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-text-dark">Edit Prayer</h3>

      <div className="mb-3">
        <label htmlFor="edit-prayer-title" className="mb-1 block text-sm font-medium text-text-dark">
          Title
        </label>
        <input
          id="edit-prayer-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (e.target.value.trim()) setShowTitleError(false)
          }}
          maxLength={100}
          className="w-full rounded-lg border border-gray-200 p-3 text-base text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-invalid={showTitleError || undefined}
          aria-describedby={showTitleError ? 'edit-title-error' : title.length > 80 ? 'edit-title-count' : undefined}
        />
        {showTitleError && (
          <p id="edit-title-error" className="mt-1 text-sm text-warning" role="alert">
            Please add a title
          </p>
        )}
        {title.length > 80 && (
          <p id="edit-title-count" aria-live="polite" className={cn('mt-1 text-xs', title.length >= 100 ? 'text-danger' : 'text-text-light')}>
            {title.length}/100
          </p>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="edit-prayer-desc" className="mb-1 block text-sm font-medium text-text-dark">
          Details (optional)
        </label>
        <textarea
          id="edit-prayer-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-gray-200 p-3 text-base text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ minHeight: '100px' }}
          aria-describedby={description.length > 800 ? 'edit-desc-count' : undefined}
        />
        {description.length > 800 && (
          <p id="edit-desc-count" aria-live="polite" className={cn('mt-1 text-xs', description.length >= 1000 ? 'text-danger' : 'text-text-light')}>
            {description.length}/1,000
          </p>
        )}
      </div>

      <CrisisBanner text={title + ' ' + description} />

      <fieldset className="mt-3">
        <legend className="mb-2 text-sm font-medium text-text-dark">Category</legend>
        <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible">
          {PRAYER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                selectedCategory === cat
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-text-dark hover:bg-gray-50',
              )}
              aria-pressed={selectedCategory === cat}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-text-light hover:text-text-dark"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt"
        >
          Save
        </button>
      </div>
    </article>
  )
}
