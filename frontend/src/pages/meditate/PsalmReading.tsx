import { useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { CompletionScreen } from '@/components/daily/CompletionScreen'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import {
  getPsalms,
  getPsalm119Sections,
} from '@/mocks/daily-experience-psalms'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { saveMeditationSession, getMeditationMinutesForWeek } from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'
import { SEO } from '@/components/SEO'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import type { PsalmInfo, Psalm119Section } from '@/types/daily-experience'

type Screen = 'selection' | 'reading' | 'section-selection' | 'complete'

export function PsalmReading() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/daily?tab=meditate" replace state={{ authRedirectMessage: 'Sign in to access guided meditations.' }} />
  return <PsalmReadingContent />
}

function PsalmReadingContent() {
  const psalms = getPsalms()
  const psalm119Sections = getPsalm119Sections()

  const [screen, setScreen] = useState<Screen>('selection')
  const [selectedPsalm, setSelectedPsalm] = useState<PsalmInfo | null>(null)
  const [selectedSection, setSelectedSection] =
    useState<Psalm119Section | null>(null)
  const [verseIndex, setVerseIndex] = useState(-1) // -1 = intro
  const [sessionDuration, setSessionDuration] = useState<number | null>(null)
  const { markMeditationComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()
  const startTimeRef = useRef(0)

  const verses = selectedSection
    ? selectedSection.verses
    : selectedPsalm
      ? selectedPsalm.verses
      : []
  const totalVerses = verses.length
  const isIntro = verseIndex === -1
  const isLastVerse = verseIndex === totalVerses - 1

  const handleSelectPsalm = (psalm: PsalmInfo) => {
    if (psalm.number === 119) {
      setScreen('section-selection')
      return
    }
    setSelectedPsalm(psalm)
    setVerseIndex(-1)
    startTimeRef.current = Date.now()
    setScreen('reading')
  }

  const handleSelectSection = (section: Psalm119Section) => {
    setSelectedSection(section)
    setSelectedPsalm(null)
    setVerseIndex(0) // No intro for sections
    startTimeRef.current = Date.now()
    setScreen('reading')
  }

  const handleComplete = () => {
    const elapsedMs = Date.now() - startTimeRef.current
    const minutes = Math.max(1, Math.round(elapsedMs / 60000))
    markMeditationComplete('psalm')
    recordActivity('meditate')
    setSessionDuration(minutes)
    saveMeditationSession({
      id: crypto.randomUUID(),
      type: 'psalm',
      date: getLocalDateString(),
      durationMinutes: minutes,
      completedAt: new Date().toISOString(),
    })
    setScreen('complete')
  }

  if (screen === 'complete') {
    const weeklyTotal = getMeditationMinutesForWeek()
    return (
      <Layout hero={<PageHero title="Psalm Reading" />}>
        {sessionDuration !== null && (
          <div className="mx-auto max-w-lg motion-safe:animate-fade-in px-4 pt-10 text-center">
            <p className="font-serif text-lg text-text-dark">
              You meditated for {sessionDuration} {sessionDuration === 1 ? 'minute' : 'minutes'}
            </p>
            <p className="mt-1 text-sm text-text-light">
              {weeklyTotal === sessionDuration
                ? 'Your first meditation this week \u2014 great start!'
                : `Total this week: ${weeklyTotal} ${weeklyTotal === 1 ? 'minute' : 'minutes'}`}
            </p>
          </div>
        )}
        <CompletionScreen
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

  if (screen === 'section-selection') {
    return (
      <Layout hero={<PageHero title="Psalm 119" subtitle="Choose a section to read." />}>
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {psalm119Sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSelectSection(section)}
                className="rounded-lg border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md"
              >
                <p className="font-semibold text-text-dark">
                  {section.hebrewLetter}
                </p>
                <p className="text-sm text-text-light">{section.verseRange}</p>
              </button>
            ))}
          </div>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setScreen('selection')}
              className="text-sm text-primary underline hover:text-primary-light"
            >
              Back to Psalm selection
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (screen === 'reading') {
    const title = selectedSection
      ? `Psalm 119: ${selectedSection.hebrewLetter}`
      : `Psalm ${selectedPsalm?.number}`

    return (
      <Layout hero={<PageHero title={title} />}>
        <div className="mx-auto max-w-lg px-4 py-10 text-center sm:py-14">

          {!isIntro && (
            <p className="mb-6 text-sm text-text-light">
              Verse {verseIndex + 1} of {totalVerses}
            </p>
          )}

          {isIntro && selectedPsalm ? (
            <div className="mb-8">
              <p className="mb-4 text-sm font-medium text-primary">
                {selectedPsalm.description}
              </p>
              <p className="text-base leading-relaxed text-text-light">
                {selectedPsalm.intro}
              </p>
            </div>
          ) : (
            <blockquote className="mx-auto mb-8 max-w-md font-serif text-xl leading-relaxed text-text-dark sm:text-2xl lg:text-3xl">
              {verses[verseIndex]}
            </blockquote>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setVerseIndex((i) => i - 1)}
              disabled={isIntro || (verseIndex === 0 && !selectedPsalm)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50 disabled:opacity-50"
              aria-label="Previous verse"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {isLastVerse ? (
              <button
                type="button"
                onClick={handleComplete}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setVerseIndex((i) => i + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
                aria-label="Next verse"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // Selection screen
  return (
    <Layout hero={<PageHero title="Psalm Reading" subtitle="Choose a Psalm to read slowly, one verse at a time." />}>
      <SEO title="Psalm Reading" description="Read and reflect on a Psalm with historical context and guided meditation." noIndex />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <AmbientSoundPill context="other-meditation" />

        <div className="space-y-3">
          {psalms.map((psalm) => (
            <button
              key={psalm.id}
              type="button"
              onClick={() => handleSelectPsalm(psalm)}
              className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-semibold text-text-dark">{psalm.title}</p>
              <p className="text-sm text-text-light">{psalm.description}</p>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  )
}
