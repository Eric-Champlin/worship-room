import { cn } from '@/lib/utils'
import type { UserSettingsVerseFindsYou } from '@/types/settings'

/**
 * Spec 6.8 — Settings section for the Verse-Finds-You toggle (and future
 * "gentle extras" — quiet, low-pressure features that surface on a separate
 * settings tab to keep them discoverable without cluttering Privacy / Notifications).
 *
 * <p>Default OFF for ALL users (Gate-G-DEFAULT-OFF). Single-tap enable/disable —
 * NO confirmation modal (Brief §4: protections are default-off + curation +
 * cooldowns + 24h limit, not a confirmation gate).
 */
interface GentleExtrasSectionProps {
  verseFindsYou: UserSettingsVerseFindsYou
  onUpdateVerseFindsYou: (updates: Partial<UserSettingsVerseFindsYou>) => void
}

export function GentleExtrasSection({
  verseFindsYou,
  onUpdateVerseFindsYou,
}: GentleExtrasSectionProps) {
  return (
    <section aria-labelledby="gentle-extras-heading">
      <h2
        id="gentle-extras-heading"
        className="mb-2 text-2xl font-semibold text-white"
      >
        Gentle extras
      </h2>
      <p className="mb-6 text-sm text-white/70">
        Quiet, low-pressure features. All off by default.
      </p>

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
          <button
            id="verse-finds-you-toggle"
            type="button"
            role="switch"
            aria-checked={verseFindsYou.enabled}
            onClick={() => onUpdateVerseFindsYou({ enabled: !verseFindsYou.enabled })}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
              verseFindsYou.enabled
                ? 'bg-violet-500'
                : 'bg-white/20',
            )}
          >
            <span className="sr-only">
              {verseFindsYou.enabled ? 'Verse Finds You is on' : 'Verse Finds You is off'}
            </span>
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-fast',
                verseFindsYou.enabled ? 'translate-x-5' : 'translate-x-0.5',
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  )
}
