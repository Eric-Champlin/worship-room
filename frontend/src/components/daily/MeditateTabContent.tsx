import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Wind,
  BookOpen,
  Heart,
  Footprints,
  ScrollText,
  Search,
  Check,
} from 'lucide-react'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useAuth } from '@/hooks/useAuth'
import { useVerseContextPreload } from '@/hooks/dailyHub/useVerseContextPreload'
import { getMeditationSuggestion } from '@/data/challenge-prefills'
import { cn } from '@/lib/utils'
import { MEDITATION_TYPES, VERSE_FRAMINGS } from '@/constants/daily-experience'
import { VersePromptCard, VersePromptSkeleton } from '@/components/daily/VersePromptCard'
import type { ChallengeActionType } from '@/types/challenges'
import type { MeditationType } from '@/types/daily-experience'
import type { MeditationVerseContext } from '@/types/meditation'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wind,
  BookOpen,
  Heart,
  Footprints,
  Scroll: ScrollText,
  Search,
}

const ROUTE_MAP: Record<string, string> = {
  breathing: '/meditate/breathing',
  soaking: '/meditate/soaking',
  gratitude: '/meditate/gratitude',
  acts: '/meditate/acts',
  psalm: '/meditate/psalms',
  examen: '/meditate/examen',
}

interface MeditateTabContentProps {
  isActive?: boolean
}

export function MeditateTabContent({ isActive = true }: MeditateTabContentProps) {
  const { isAuthenticated } = useAuth()
  const { completedMeditationTypes } = useCompletionTracking()
  const allComplete = completedMeditationTypes.length === 6
  const location = useLocation()
  const navigate = useNavigate()
  const authModal = useAuthModal()
  const { verseContext, isHydrating, clearVerseContext } = useVerseContextPreload('meditate')

  const meditationVerseContext: MeditationVerseContext | null = verseContext
    ? { book: verseContext.book, chapter: verseContext.chapter, startVerse: verseContext.startVerse, endVerse: verseContext.endVerse, reference: verseContext.reference }
    : null

  useEffect(() => {
    if (!isActive) {
      clearVerseContext()
    }
  }, [isActive, clearVerseContext])

  // Challenge context: highlight a suggested meditation type
  const challengeContext = (location.state as { challengeContext?: { actionType: string; dayTitle: string } } | null)?.challengeContext
  const suggestedRoute = challengeContext
    ? getMeditationSuggestion(challengeContext.actionType as ChallengeActionType, challengeContext.dayTitle)
    : null
  // Find the meditation id that matches the suggested route
  const suggestedId = suggestedRoute
    ? Object.entries(ROUTE_MAP).find(([, route]) => route === suggestedRoute)?.[0] ?? null
    : null

  return (
    <div>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {isAuthenticated && allComplete && (
          <div className="mb-8 motion-safe:animate-golden-glow rounded-xl border border-amber-200/30 bg-amber-900/20 p-6 text-center">
            <p className="text-lg font-semibold text-white">
              You completed all 6 meditations today! What a beautiful time with
              God.
            </p>
          </div>
        )}

        {/* Verse Prompt Card (from Bible bridge) */}
        {isHydrating && <VersePromptSkeleton />}
        {verseContext && (
          <VersePromptCard
            context={verseContext}
            onRemove={clearVerseContext}
            framingLine={VERSE_FRAMINGS.meditate}
          />
        )}

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {MEDITATION_TYPES.map((type) => {
            const Icon = ICON_MAP[type.icon]
            const isComplete = completedMeditationTypes.includes(
              type.id as MeditationType,
            )
            const isSuggested = suggestedId === type.id
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    authModal?.openAuthModal('Sign in to start meditating')
                    return
                  }
                  // Clear challenge context on navigation
                  if (challengeContext) {
                    navigate(location.pathname + location.search, { replace: true, state: null })
                  }
                  navigate(ROUTE_MAP[type.id], {
                    ...(meditationVerseContext && { state: { meditationVerseContext } }),
                  })
                }}
                className={cn(
                  'group rounded-2xl p-4 text-left sm:p-5',
                  'transition-all duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
                  isSuggested
                    ? [
                        'border-2 border-primary bg-primary/10 ring-1 ring-primary/30',
                        'shadow-[0_0_30px_rgba(139,92,246,0.12),0_4px_20px_rgba(0,0,0,0.3)]',
                      ]
                    : [
                        'border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm',
                        'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
                        'hover:bg-white/[0.09] hover:border-white/[0.18]',
                        'hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]',
                        'hover:-translate-y-0.5',
                        'motion-reduce:hover:translate-y-0',
                      ]
                )}
              >
                {isSuggested && (
                  <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Suggested
                  </span>
                )}
                <div className="mb-3 flex items-center justify-between">
                  {Icon && <Icon className="h-8 w-8 text-primary" />}
                  {isAuthenticated && isComplete && (
                    <>
                      <Check
                        className="h-5 w-5 text-success"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{type.title} completed</span>
                    </>
                  )}
                </div>
                <h3 className="mb-1 text-base font-semibold text-white sm:text-lg">
                  {type.title}
                </h3>
                <p className="text-xs text-white/60 sm:text-sm">
                  {type.description}
                </p>
                <p className="mt-2 text-xs font-medium text-primary">
                  {type.time}
                </p>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
