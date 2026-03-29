import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { addPrayer } from '@/services/prayer-list-storage'
import {
  PRAYER_CATEGORIES,
  CATEGORY_LABELS,
  type PrayerCategory,
} from '@/constants/prayer-categories'

interface SaveToPrayersFormProps {
  prayerContent: string
  prayerCategory?: PrayerCategory
  prayerId: string
  isOpen: boolean
  onSaved: () => void
  onCancel: () => void
}

const SAVEABLE_CATEGORIES = PRAYER_CATEGORIES.filter((c) => c !== 'discussion')

export function SaveToPrayersForm({
  prayerContent,
  prayerCategory,
  prayerId,
  isOpen,
  onSaved,
  onCancel,
}: SaveToPrayersFormProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [title, setTitle] = useState(prayerContent.slice(0, 100))
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory>(
    prayerCategory && prayerCategory !== 'discussion' ? prayerCategory : 'other',
  )

  const handleSave = () => {
    const result = addPrayer({
      title: title.trim() || prayerContent.slice(0, 100),
      description: prayerContent,
      category: selectedCategory,
      sourceType: 'prayer_wall',
      sourceId: prayerId,
    })

    if (result) {
      onSaved()
      showToast('Saved to your prayer list', 'success', {
        label: 'View >',
        onClick: () => navigate('/my-prayers'),
      })
    }
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <label htmlFor={`save-title-${prayerId}`} className="sr-only">
            Prayer title
          </label>
          <input
            id={`save-title-${prayerId}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Prayer title..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Prayer category">
            {SAVEABLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'min-h-[44px] rounded-full px-3 py-1.5 text-xs transition-colors',
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'border border-white/15 bg-white/10 text-white/70 hover:bg-white/15',
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Save to My Prayers
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-2 text-sm text-white/50 hover:text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
