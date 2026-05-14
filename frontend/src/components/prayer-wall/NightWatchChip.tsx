/**
 * @deprecated since Prayer Wall Redesign (2026-05-13).
 * NightWatchChip has been replaced by {@link NightModeBadge}, which lives in
 * the global Navbar instead of the PrayerWallHero. This shim is preserved for
 * one release cycle to avoid breaking external imports; new code should
 * import NightModeBadge directly.
 *
 * The original NightWatchChip accepted a `source: 'auto' | 'manual'` prop,
 * but NightModeBadge reads source from the hook directly. The shim accepts
 * (and ignores) the legacy prop for type compatibility. Migrating callers
 * should remove the prop.
 */
import { NightModeBadge } from '@/components/prayer-wall/NightModeBadge'

interface NightWatchChipProps {
  source?: 'auto' | 'manual'
}

export function NightWatchChip(_props: NightWatchChipProps) {
  return <NightModeBadge />
}
