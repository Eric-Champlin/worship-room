import { useState, useRef, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { CompletionScreen } from '@/components/daily/CompletionScreen'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import {
  getGratitudeAffirmation,
  getGratitudeVerses,
} from '@/mocks/daily-experience-mock-data'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { saveMeditationSession, getMeditationMinutesForWeek } from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'
import { SEO } from '@/components/SEO'
import { MEDITATE_GRATITUDE_METADATA } from '@/lib/seo/routeMetadata'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import type { MeditationVerseContext } from '@/types/meditation'

export function GratitudeReflection() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/daily?tab=meditate" replace state={{ authRedirectMessage: 'Sign in to access guided meditations.' }} />
  return <GratitudeReflectionContent />
}

let nextItemId = 3

function GratitudeReflectionContent() {
  const location = useLocation()
  const meditationVerseContext = (location.state as { meditationVerseContext?: MeditationVerseContext } | null)?.meditationVerseContext ?? null
  const [items, setItems] = useState<{ id: number; text: string }[]>([
    { id: 0, text: '' },
    { id: 1, text: '' },
    { id: 2, text: '' },
  ])
  const [isComplete, setIsComplete] = useState(false)
  const [completionVerse] = useState(() => {
    const verses = getGratitudeVerses()
    return verses[Math.floor(Math.random() * verses.length)]
  })
  const { markMeditationComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()
  const [sessionDuration, setSessionDuration] = useState<number | null>(null)

  const startTimeRef = useRef(Date.now())
  const lastInputRef = useRef<HTMLInputElement>(null)
  const prevItemCountRef = useRef(items.length)

  // Focus new input after "Add another"
  useEffect(() => {
    if (items.length > prevItemCountRef.current) {
      lastInputRef.current?.focus()
    }
    prevItemCountRef.current = items.length
  }, [items.length])

  const allThreeFilled = items.slice(0, 3).every((item) => item.text.trim().length > 0)
  const filledCount = items.filter((item) => item.text.trim().length > 0).length

  const handleChange = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], text: value }
      return next
    })
  }

  const handleAddAnother = () => {
    const id = nextItemId++
    setItems((prev) => [...prev, { id, text: '' }])
  }

  const handleDone = () => {
    const elapsedMs = Date.now() - startTimeRef.current
    const minutes = Math.max(1, Math.round(elapsedMs / 60000))
    markMeditationComplete('gratitude')
    recordActivity('meditate')
    setSessionDuration(minutes)
    saveMeditationSession({
      id: crypto.randomUUID(),
      type: 'gratitude',
      date: getLocalDateString(),
      durationMinutes: minutes,
      completedAt: new Date().toISOString(),
      ...(meditationVerseContext && { verseContext: meditationVerseContext }),
    })
    setIsComplete(true)
  }

  if (isComplete) {
    const affirmation = getGratitudeAffirmation(filledCount)

    return (
      <Layout hero={<PageHero title="Gratitude Reflection" scriptWord="Reflection" />}>
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
          {sessionDuration !== null && (() => {
            const weeklyTotal = getMeditationMinutesForWeek()
            return (
              <div className="mb-6 motion-safe:animate-fade-in">
                <p className="font-serif text-lg text-text-dark">
                  You meditated for {sessionDuration} {sessionDuration === 1 ? 'minute' : 'minutes'}
                </p>
                <p className="mt-1 text-sm text-text-light">
                  {weeklyTotal === sessionDuration
                    ? 'Your first meditation this week \u2014 great start!'
                    : `Total this week: ${weeklyTotal} ${weeklyTotal === 1 ? 'minute' : 'minutes'}`}
                </p>
              </div>
            )
          })()}
        </div>
        <CompletionScreen
          showMeditationStats
          ctas={[
            { label: 'Try a different meditation', to: '/daily?tab=meditate', primary: true },
            { label: 'Continue to Pray \u2192', to: '/daily?tab=pray' },
            { label: 'Continue to Journal \u2192', to: '/daily?tab=journal' },
            { label: 'Visit the Prayer Wall \u2192', to: '/prayer-wall' },
          ]}
        />
      </Layout>
    )
  }

  return (
    <Layout hero={<PageHero title="Gratitude Reflection" subtitle="Name the things you're thankful for today." scriptWord="Reflection" />}>
      <SEO {...MEDITATE_GRATITUDE_METADATA} />
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <AmbientSoundPill context="other-meditation" />

        <div className="space-y-4">
          {items.map((item, index) => (
            <input
              key={item.id}
              ref={index === items.length - 1 ? lastInputRef : undefined}
              type="text"
              value={item.text}
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
