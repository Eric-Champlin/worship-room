import { useEffect, useState } from 'react'
import { Heart, Check } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { containsCrisisKeyword } from '@/constants/crisis-resources'
import { getGratitudeEntries, getTodayGratitude, saveGratitudeEntry } from '@/services/gratitude-storage'
import { GRATITUDE_LABELS } from '@/constants/gratitude'
import { getDayOfYear } from '@/constants/dashboard/ai-insights'

interface GratitudeWidgetProps {
  onGratitudeSaved?: () => void
}

const FIELD_1_PLACEHOLDERS = [
  "A person I'm thankful for...",
  'Something that made me smile...',
  'A blessing I noticed today...',
]

const FIELD_2_PLACEHOLDERS = [
  'A moment of peace today...',
  'Something I learned...',
  'A prayer God answered...',
]

const FIELD_3_PLACEHOLDERS = [
  'Something beautiful I saw...',
  'A way God showed up...',
  "Something I don't want to forget...",
]

type WidgetMode = 'input' | 'saved' | 'editing'

function NumberedHeart({ number }: { number: number }) {
  return (
    <span
      className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <Heart className="absolute h-5 w-5 fill-pink-400/20 text-pink-400" />
      <span className="relative text-xs font-bold text-pink-400">{number}</span>
    </span>
  )
}

export function GratitudeWidget({ onGratitudeSaved }: GratitudeWidgetProps) {
  const [mode, setMode] = useState<WidgetMode>('input')
  const [values, setValues] = useState<[string, string, string]>(['', '', ''])
  const { showToast } = useToast()
  const { playSoundEffect } = useSoundEffects()

  // Check for existing entry on mount
  useEffect(() => {
    const existing = getTodayGratitude()
    if (existing) {
      setMode('saved')
    }
  }, [])

  const [isFirstTime] = useState(() => getGratitudeEntries().length === 0)

  // Rotating placeholders (day-of-year modulo 3)
  const placeholderIndex = getDayOfYear() % 3
  const placeholders = [
    FIELD_1_PLACEHOLDERS[placeholderIndex],
    FIELD_2_PLACEHOLDERS[placeholderIndex],
    FIELD_3_PLACEHOLDERS[placeholderIndex],
  ]

  // Crisis detection across all 3 fields
  const combinedText = values.join(' ')
  const showCrisis = mode !== 'saved' && containsCrisisKeyword(combinedText)

  const hasContent = values.some((v) => v.trim().length > 0)

  const handleChange = (index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev] as [string, string, string]
      next[index] = value
      return next
    })
  }

  const handleSave = () => {
    const isEdit = mode === 'editing'
    saveGratitudeEntry([...values])
    setMode('saved')

    if (!isEdit) {
      onGratitudeSaved?.()
    }

    showToast('Gratitude logged! Thank you for counting your blessings.', 'success')
    playSoundEffect('chime')
  }

  const handleEdit = () => {
    const existing = getTodayGratitude()
    if (existing) {
      const padded: [string, string, string] = [
        existing.items[0] ?? '',
        existing.items[1] ?? '',
        existing.items[2] ?? '',
      ]
      setValues(padded)
    }
    setMode('editing')
  }

  // Saved state — show read-only entries
  if (mode === 'saved') {
    const todayEntry = getTodayGratitude()
    return (
      <div className="space-y-3">
        <div className="space-y-2" role="list" aria-label="Today's gratitude entries">
          {todayEntry?.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2" role="listitem">
              <Check
                className="h-4 w-4 flex-shrink-0 text-success"
                aria-hidden="true"
              />
              <span className="text-sm text-white/80">{item}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleEdit}
          className="min-h-[44px] text-sm text-white/70 transition-colors hover:text-white"
        >
          Edit
        </button>
      </div>
    )
  }

  // Input / Editing state
  return (
    <div className="space-y-3">
      {showCrisis && <CrisisBanner text={combinedText} />}

      {isFirstTime && (
        <p className="text-sm italic text-white/60">
          Count three blessings from today
        </p>
      )}

      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <NumberedHeart number={i + 1} />
            <input
              type="text"
              value={values[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder={placeholders[i]}
              maxLength={150}
              aria-label={GRATITUDE_LABELS[i]}
              className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!hasContent}
        className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto w-full"
      >
        Save
      </button>
    </div>
  )
}
