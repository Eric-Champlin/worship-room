import { cn } from '@/lib/utils'
import type {
  UserSettingsVerseFindsYou,
  UserSettingsPresence,
} from '@/types/settings'

/**
 * Spec 6.8 + 6.11b — Settings section for the gentle extras toggles
 * (quiet, low-pressure features that surface on a separate settings tab
 * to keep them discoverable without cluttering Privacy / Notifications).
 *
 * <p>Toggles:
 * <ul>
 *   <li>Verse Finds You (Spec 6.8) — default OFF (Gate-G-DEFAULT-OFF)</li>
 *   <li>Count me as present when I'm reading (Spec 6.11b) —
 *       default ON (Gate-G-DEFAULT-ON-FOR-COUNTING). Toggle controls the
 *       inverse — when OFF, the user is hidden from the count.</li>
 * </ul>
 */
interface GentleExtrasSectionProps {
  verseFindsYou: UserSettingsVerseFindsYou
  onUpdateVerseFindsYou: (updates: Partial<UserSettingsVerseFindsYou>) => void
  presence: UserSettingsPresence
  onUpdatePresence: (updates: Partial<UserSettingsPresence>) => void
}

export function GentleExtrasSection({
  verseFindsYou,
  onUpdateVerseFindsYou,
  presence,
  onUpdatePresence,
}: GentleExtrasSectionProps) {
  // Spec 6.11b — toggle UI state is the inverse of optedOut: ON = counted, OFF = hidden.
  const presenceCounted = !presence.optedOut
  return (
    <section aria-labelledby="gentle-extras-heading">
      <h2
        id="gentle-extras-heading"
        className="mb-2 text-2xl font-semibold text-white"
      >
        Gentle extras
      </h2>
      <p className="mb-6 text-sm text-white/70">
        Quiet, low-pressure features. Tuned for calm.
      </p>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label
                htmlFor="verse-finds-you-toggle"
                className="block text-base font-medium text-white"
              >
                Verse Finds You
              </label>
              <p className="mt-1 text-sm text-white/70">
                Occasionally, after you share a prayer, comment, or spend time
                reading, a short scripture may appear. Off by default. You can
                turn it on anytime.
              </p>
            </div>
            {/*
              Click target = 44×44 (WCAG 2.5.5); visual switch = 24×44 inside.
              Outer button carries the role/aria/click handler; inner span carries
              the violet pill visuals. Pattern matches `min-h-[44px] min-w-[44px]`
              precedent in Navbar.tsx mobile menu button and TypewriterInput
              mic button.
            */}
            <button
              id="verse-finds-you-toggle"
              type="button"
              role="switch"
              aria-checked={verseFindsYou.enabled}
              onClick={() => onUpdateVerseFindsYou({ enabled: !verseFindsYou.enabled })}
              className={cn(
                'inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
              )}
            >
              <span className="sr-only">
                {verseFindsYou.enabled ? 'Verse Finds You is on' : 'Verse Finds You is off'}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-fast',
                  verseFindsYou.enabled ? 'bg-violet-500' : 'bg-white/20',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-fast',
                    verseFindsYou.enabled ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Spec 6.11b — Presence toggle. Inverted semantics: toggle ON = counted (optedOut=false). */}
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label
                htmlFor="presence-toggle"
                className="block text-base font-medium text-white"
              >
                Count me as present when I'm reading
              </label>
              <p className="mt-1 text-sm text-white/70">
                Others see how many people are on the Prayer Wall. Turn this off
                to hide yourself from the count.
              </p>
            </div>
            {/*
              Click target = 44×44 (WCAG 2.5.5); visual switch = 24×44 inside.
              Same shape as the Verse Finds You toggle above — kept identical
              so a future consolidation refactor can extract them together
              without drift. See spec-tracker.md § Phase 6 brief-drift
              remediation block for the consolidation note.
            */}
            <button
              id="presence-toggle"
              type="button"
              role="switch"
              aria-checked={presenceCounted}
              onClick={() => onUpdatePresence({ optedOut: presenceCounted })}
              className={cn(
                'inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
              )}
            >
              <span className="sr-only">
                {presenceCounted
                  ? 'You are counted as present'
                  : 'You are hidden from the count'}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-fast',
                  presenceCounted ? 'bg-violet-500' : 'bg-white/20',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-fast',
                    presenceCounted ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
