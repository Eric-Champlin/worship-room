import { useState, useCallback, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'
import { useRovingTabindex } from '@/hooks/useRovingTabindex'

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
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(title.length > 0 || description.length > 0)

  const initialCategoryIndex = useMemo(
    () => (selectedCategory ? PRAYER_CATEGORIES.indexOf(selectedCategory) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const { setFocusedIndex: setCategoryFocusedIndex, getItemProps: getCategoryItemProps } = useRovingTabindex({
    itemCount: PRAYER_CATEGORIES.length,
    onSelect: (index) => {
      setSelectedCategory(PRAYER_CATEGORIES[index])
      setShowCategoryError(false)
    },
    orientation: 'horizontal',
    initialIndex: initialCategoryIndex,
  })

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
        'overflow-hidden transition-all motion-reduce:transition-none duration-base ease-standard',
        isOpen ? 'visible mb-4 max-h-[800px] opacity-100' : 'invisible max-h-0 opacity-0',
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Add a Prayer</h2>

        {/* Title input */}
        <div className="mb-3">
          <label htmlFor="prayer-title" className="mb-1 block text-sm font-medium text-white/70">
            Title<span className="text-red-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
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
            className="w-full rounded-lg border border-white/15 bg-white/5 p-3 text-base text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Prayer title"
            aria-invalid={showTitleError || undefined}
            aria-describedby={showTitleError ? 'title-error title-char-count' : 'title-char-count'}
          />
          {showTitleError && (
            <p id="title-error" className="mt-1 flex items-center gap-1.5 text-sm text-red-500" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Give your prayer a short title
            </p>
          )}
          <div className="mt-1">
            <CharacterCount current={title.length} max={100} warningAt={80} dangerAt={96} visibleAt={80} id="title-char-count" />
          </div>
        </div>

        {/* Description textarea */}
        <div className="mb-3">
          <label htmlFor="prayer-description" className="mb-1 block text-sm font-medium text-white/70">
            Details (optional)
          </label>
          <textarea
            id="prayer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Add details..."
            className="w-full resize-none rounded-lg border border-white/15 bg-white/5 p-3 text-base text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ minHeight: '100px' }}
            aria-label="Prayer details"
            aria-describedby="desc-char-count"
          />
          <div className="mt-1">
            <CharacterCount current={description.length} max={1000} warningAt={800} dangerAt={960} visibleAt={500} id="desc-char-count" />
          </div>
        </div>

        {/* Crisis banner */}
        <CrisisBanner text={title + ' ' + description} />

        {/* Category pills */}
        <fieldset
          className="mt-3"
          aria-invalid={showCategoryError ? 'true' : undefined}
          aria-describedby={showCategoryError ? 'prayer-category-error' : undefined}
        >
          <legend className="mb-2 text-sm font-medium text-white/70">Category</legend>
          <div role="radiogroup" aria-label="Prayer category" className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible">
            {PRAYER_CATEGORIES.map((cat, index) => {
              const itemProps = getCategoryItemProps(index)
              return (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={selectedCategory === cat}
                  onClick={() => {
                    setSelectedCategory(cat)
                    setShowCategoryError(false)
                    setCategoryFocusedIndex(index)
                  }}
                  className={cn(
                    'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-fast ease-standard whitespace-nowrap',
                    selectedCategory === cat
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10',
                  )}
                  tabIndex={itemProps.tabIndex}
                  onKeyDown={itemProps.onKeyDown}
                  ref={itemProps.ref}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              )
            })}
          </div>
          {showCategoryError && (
            <p id="prayer-category-error" className="mt-2 text-sm text-warning" role="alert">
              Please choose a category
            </p>
          )}
        </fieldset>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm font-medium text-white/50 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-[colors,transform] duration-fast hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Save Prayer
          </button>
        </div>
      </div>
      <UnsavedChangesModal isOpen={showModal} onLeave={confirmLeave} onStay={cancelLeave} />
    </div>
  )
}
