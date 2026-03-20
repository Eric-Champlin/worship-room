import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'

interface PrayerComposerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string, description: string, category: PrayerCategory) => void
}

export function PrayerComposer({ isOpen, onClose, onSave }: PrayerComposerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory | null>(null)
  const [showTitleError, setShowTitleError] = useState(false)
  const [showCategoryError, setShowCategoryError] = useState(false)

  const handleSave = useCallback(() => {
    const hasTitle = title.trim().length > 0
    const hasCategory = selectedCategory !== null

    if (!hasTitle) setShowTitleError(true)
    if (!hasCategory) setShowCategoryError(true)
    if (!hasTitle || !hasCategory) return

    onSave(title.trim(), description.trim(), selectedCategory)

    // Reset state
    setTitle('')
    setDescription('')
    setSelectedCategory(null)
    setShowTitleError(false)
    setShowCategoryError(false)
  }, [title, description, selectedCategory, onSave])

  const handleCancel = useCallback(() => {
    setTitle('')
    setDescription('')
    setSelectedCategory(null)
    setShowTitleError(false)
    setShowCategoryError(false)
    onClose()
  }, [onClose])

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'visible mb-4 max-h-[800px] opacity-100' : 'invisible max-h-0 opacity-0',
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-dark">Add a Prayer</h2>

        {/* Title input */}
        <div className="mb-3">
          <label htmlFor="prayer-title" className="mb-1 block text-sm font-medium text-text-dark">
            Title
          </label>
          <input
            id="prayer-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (e.target.value.trim()) setShowTitleError(false)
            }}
            maxLength={100}
            placeholder="What do you want to pray about?"
            className="w-full rounded-lg border border-gray-200 p-3 text-base text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-invalid={showTitleError || undefined}
            aria-describedby={showTitleError ? 'title-error' : title.length > 80 ? 'title-char-count' : undefined}
          />
          {showTitleError && (
            <p id="title-error" className="mt-1 text-sm text-warning" role="alert">
              Please add a title
            </p>
          )}
          {title.length > 80 && (
            <p
              id="title-char-count"
              aria-live="polite"
              className={cn('mt-1 text-xs', title.length >= 100 ? 'text-danger' : 'text-text-light')}
            >
              {title.length}/100
            </p>
          )}
        </div>

        {/* Description textarea */}
        <div className="mb-3">
          <label htmlFor="prayer-description" className="mb-1 block text-sm font-medium text-text-dark">
            Details (optional)
          </label>
          <textarea
            id="prayer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Add details..."
            className="w-full resize-none rounded-lg border border-gray-200 p-3 text-base text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ minHeight: '100px' }}
            aria-describedby={description.length > 800 ? 'desc-char-count' : undefined}
          />
          {description.length > 800 && (
            <p
              id="desc-char-count"
              aria-live="polite"
              className={cn('mt-1 text-xs', description.length >= 1000 ? 'text-danger' : 'text-text-light')}
            >
              {description.length}/1,000
            </p>
          )}
        </div>

        {/* Crisis banner */}
        <CrisisBanner text={title + ' ' + description} />

        {/* Category pills */}
        <fieldset className="mt-3">
          <legend className="mb-2 text-sm font-medium text-text-dark">Category</legend>
          <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible">
            {PRAYER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat)
                  setShowCategoryError(false)
                }}
                className={cn(
                  'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-in-out whitespace-nowrap',
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
          {showCategoryError && (
            <p className="mt-2 text-sm text-warning" role="alert">
              Please choose a category
            </p>
          )}
        </fieldset>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm font-medium text-text-light hover:text-text-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt"
          >
            Save Prayer
          </button>
        </div>
      </div>
    </div>
  )
}
