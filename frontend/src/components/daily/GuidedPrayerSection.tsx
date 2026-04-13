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
            <button
              key={session.id}
              type="button"
              onClick={() => handleCardClick(session)}
              className="relative w-[220px] min-w-[220px] flex flex-col flex-shrink-0 snap-center rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 text-left transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.10] hover:border-white/20 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:w-auto sm:min-w-0 sm:min-h-[260px] active:scale-[0.98]"
            >
              {isComplete && (
                <CheckCircle2
                  className="absolute right-3 top-3 h-4 w-4 text-success"
                  aria-hidden="true"
                />
              )}

              {ThemeIcon && (
                <ThemeIcon className="mb-3 h-8 w-8 text-primary" aria-hidden="true" />
              )}

              <h3 className="font-semibold text-base text-white">{session.title}</h3>

              <p className="mt-1 text-sm leading-relaxed text-white/70 flex-1">
                {session.description}
              </p>

              <span className="mt-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                {session.durationMinutes} min
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
