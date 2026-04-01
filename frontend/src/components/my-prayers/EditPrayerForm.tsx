import { useState, useCallback, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'
import { useRovingTabindex } from '@/hooks/useRovingTabindex'
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

  const isDirty = title !== prayer.title || description !== prayer.description || selectedCategory !== prayer.category
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  const initialCategoryIndex = useMemo(
    () => PRAYER_CATEGORIES.indexOf(selectedCategory),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const { setFocusedIndex: setEditCategoryFocusedIndex, getItemProps: getEditCategoryItemProps } = useRovingTabindex({
    itemCount: PRAYER_CATEGORIES.length,
    onSelect: (index) => {
      setSelectedCategory(PRAYER_CATEGORIES[index])
    },
    orientation: 'horizontal',
    initialIndex: initialCategoryIndex >= 0 ? initialCategoryIndex : 0,
  })

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
    <article className="rounded-2xl border border-primary/30 bg-white/5 backdrop-blur-sm p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Edit Prayer</h3>

      <div className="mb-3">
        <label htmlFor="edit-prayer-title" className="mb-1 block text-sm font-medium text-white/70">
          Title<span className="text-red-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
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
          className="w-full rounded-lg border border-white/15 bg-white/5 p-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Prayer title"
          aria-invalid={showTitleError || undefined}
          aria-describedby={showTitleError ? 'edit-title-error edit-title-count' : 'edit-title-count'}
        />
        {showTitleError && (
          <p id="edit-title-error" className="mt-1 flex items-center gap-1.5 text-sm text-red-500" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Give your prayer a short title
          </p>
        )}
        <div className="mt-1">
          <CharacterCount current={title.length} max={100} warningAt={80} dangerAt={96} visibleAt={80} id="edit-title-count" />
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="edit-prayer-desc" className="mb-1 block text-sm font-medium text-white/70">
          Details (optional)
        </label>
        <textarea
          id="edit-prayer-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-white/15 bg-white/5 p-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ minHeight: '100px' }}
          aria-label="Prayer details"
          aria-describedby="edit-desc-count"
        />
        <div className="mt-1">
          <CharacterCount current={description.length} max={1000} warningAt={800} dangerAt={960} visibleAt={500} id="edit-desc-count" />
        </div>
      </div>

      <CrisisBanner text={title + ' ' + description} />

      <fieldset className="mt-3">
        <legend className="mb-2 text-sm font-medium text-white/70">Category</legend>
        <div role="radiogroup" aria-label="Prayer category" className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible">
          {PRAYER_CATEGORIES.map((cat, index) => {
            const itemProps = getEditCategoryItemProps(index)
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={selectedCategory === cat}
                onClick={() => { setSelectedCategory(cat); setEditCategoryFocusedIndex(index) }}
                className={cn(
                  'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
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
      </fieldset>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-white/50 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Save
        </button>
      </div>

      <UnsavedChangesModal isOpen={showModal} onLeave={confirmLeave} onStay={cancelLeave} />
    </article>
  )
}
