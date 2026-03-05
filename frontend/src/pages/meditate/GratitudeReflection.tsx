import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { CompletionScreen } from '@/components/daily/CompletionScreen'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import {
  getGratitudeAffirmation,
  getGratitudeVerses,
} from '@/mocks/daily-experience-mock-data'

export function GratitudeReflection() {
  const [items, setItems] = useState(['', '', ''])
  const [isComplete, setIsComplete] = useState(false)
  const [completionVerse] = useState(() => {
    const verses = getGratitudeVerses()
    return verses[Math.floor(Math.random() * verses.length)]
  })
  const { markMeditationComplete } = useCompletionTracking()

  const lastInputRef = useRef<HTMLInputElement>(null)
  const prevItemCountRef = useRef(items.length)

  // Focus new input after "Add another"
  useEffect(() => {
    if (items.length > prevItemCountRef.current) {
      lastInputRef.current?.focus()
    }
    prevItemCountRef.current = items.length
  }, [items.length])

  const allThreeFilled = items.slice(0, 3).every((item) => item.trim().length > 0)
  const filledCount = items.filter((item) => item.trim().length > 0).length

  const handleChange = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleAddAnother = () => {
    setItems((prev) => [...prev, ''])
  }

  const handleDone = () => {
    markMeditationComplete('gratitude')
    setIsComplete(true)
  }

  if (isComplete) {
    const affirmation = getGratitudeAffirmation(filledCount)

    return (
      <Layout hero={<PageHero title="Gratitude Reflection" />}>
        <div className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="mb-4 text-lg font-semibold text-text-dark">
            {affirmation}
          </p>
          <blockquote className="mb-2 font-serif text-lg italic text-text-light">
            &ldquo;{completionVerse.text}&rdquo;
          </blockquote>
          <p className="mb-8 text-sm text-text-light">
            {completionVerse.reference} WEB
          </p>
        </div>
        <CompletionScreen
          ctas={[
            { label: 'Try a different meditation', to: '/meditate', primary: true },
            { label: 'Continue to Pray \u2192', to: '/pray' },
            { label: 'Continue to Journal \u2192', to: '/journal' },
            { label: 'Visit the Prayer Wall \u2192', to: '/prayer-wall' },
          ]}
        />
      </Layout>
    )
  }

  return (
    <Layout hero={<PageHero title="Gratitude Reflection" subtitle="Name the things you're thankful for today." />}>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">

        <div className="space-y-4">
          {items.map((item, index) => (
            <input
              key={index}
              ref={index === items.length - 1 ? lastInputRef : undefined}
              type="text"
              value={item}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder="I'm grateful for..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={`Gratitude item ${index + 1}`}
            />
          ))}
        </div>

        {allThreeFilled && (
          <button
            type="button"
            onClick={handleAddAnother}
            className="mt-4 inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary-light"
          >
            <Plus className="h-4 w-4" />
            Add another
          </button>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleDone}
            disabled={filledCount === 0}
            className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </Layout>
  )
}
