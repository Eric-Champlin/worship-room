import { WatchToggle } from './WatchToggle'
import { WATCH_SETTINGS_COPY } from '@/constants/watch-copy'
import type { UserSettingsPrayerWall, WatchPreference } from '@/types/settings'

interface SensitiveFeaturesSectionProps {
  prayerWall: UserSettingsPrayerWall
  onUpdatePrayerWall: (updates: Partial<UserSettingsPrayerWall>) => void
}

/**
 * Spec 6.4 — Settings section for opt-in safety-related features.
 * MPD-11: "Sensitive features" is the canonical name; becomes home for
 * future safety opt-in features (NOT the entry point for any non-safety
 * preference).
 */
export function SensitiveFeaturesSection({
  prayerWall,
  onUpdatePrayerWall,
}: SensitiveFeaturesSectionProps) {
  const handleWatchChange = (next: WatchPreference) => {
    onUpdatePrayerWall({ watchEnabled: next })
  }

  return (
    <section>
      <h2 className="mb-2 text-2xl font-semibold text-white">
        {WATCH_SETTINGS_COPY.sectionHeading}
      </h2>
      <p className="mb-6 text-sm text-white/70">
        {WATCH_SETTINGS_COPY.sectionHelper}
      </p>
      <WatchToggle
        value={prayerWall.watchEnabled}
        onChange={handleWatchChange}
      />
    </section>
  )
}
