import {
  Sunrise,
  Moon,
  Leaf,
  Heart,
  Sparkles,
  Unlock,
  Shield,
  HandHeart,
  CheckCircle2,
} from 'lucide-react'
import type { GuidedPrayerSession } from '@/types/guided-prayer'
import { GUIDED_PRAYER_SESSIONS } from '@/data/guided-prayer-sessions'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { FrostedCard } from '@/components/homepage/FrostedCard'

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sunrise,
  Moon,
  Leaf,
  Heart,
  Sparkles,
  Unlock,
  Shield,
  HandHeart,
}

interface GuidedPrayerSectionProps {
  onStartSession: (session: GuidedPrayerSession) => void
}

export function GuidedPrayerSection({ onStartSession }: GuidedPrayerSectionProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { isGuidedPrayerComplete } = useCompletionTracking()

  const handleCardClick = (session: GuidedPrayerSession) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to start a guided prayer session')
      return
    }
    onStartSession(session)
  }

  return (
    <section aria-labelledby="guided-prayer-heading" id="guided-prayer-section">
      <h2
        id="guided-prayer-heading"
        className="mb-5 font-bold text-white text-xl sm:text-2xl"
      >
        Guided Prayer Sessions
      </h2>
      <div className="mt-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-5">
        {GUIDED_PRAYER_SESSIONS.map((session) => {
          const ThemeIcon = ICON_COMPONENTS[session.icon]
          const isComplete = isAuthenticated && isGuidedPrayerComplete(session.id)

          return (
            <FrostedCard
              key={session.id}
              as="button"
              variant="default"
              onClick={() => handleCardClick(session)}
              className="relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center p-7 sm:w-auto sm:min-w-0 sm:min-h-[256px] text-left"
            >
              {isComplete && (
                <CheckCircle2
                  className="absolute right-3 top-3 h-4 w-4 text-success"
                  aria-hidden="true"
                />
              )}

              <div className="mb-2 flex flex-row items-center gap-3">
                {ThemeIcon && (
                  <ThemeIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
                )}
                <h3 className="font-semibold text-base text-white">{session.title}</h3>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-white/70 flex-1">
                {session.description}
              </p>

              <span className="mt-4 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                {session.durationMinutes} min
              </span>
            </FrostedCard>
          )
        })}
      </div>
    </section>
  )
}
