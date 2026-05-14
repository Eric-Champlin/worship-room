import { useState, useRef } from 'react'
import { Moon, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useSettings } from '@/hooks/useSettings'
import { useNightMode } from '@/hooks/useNightMode'
import { cn } from '@/lib/utils'
import type { NightModePreference } from '@/types/settings'

const CYCLE: Record<NightModePreference, NightModePreference> = {
  off: 'auto',
  auto: 'on',
  on: 'off',
}

const ICON_STATE: Record<NightModePreference, { fillClass: string; label: string }> = {
  off: { fillClass: 'text-white/50', label: '' },
  auto: { fillClass: 'text-white/80', label: 'Auto' },
  on: { fillClass: 'text-violet-300', label: 'On' },
}

/**
 * Prayer Wall Redesign (2026-05-13) — replaces NightWatchChip.
 *
 * Renders in the global Navbar user-state slot. The badge is an active-state
 * indicator — it returns null when night mode is not currently active.
 * Tapping the badge cycles Off → Auto → On. A secondary Info icon opens a
 * focus-trapped popover with a link to Settings.
 */
export function NightModeBadge() {
  const { updatePrayerWall } = useSettings()
  const { active, userPreference } = useNightMode()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useFocusTrap(popoverOpen, () => setPopoverOpen(false))

  if (!active) return null

  const next = CYCLE[userPreference]
  const stateLabel =
    userPreference === 'auto' ? 'Auto' : userPreference === 'on' ? 'On' : 'Off'
  const ariaLabel = `Night Mode is ${stateLabel}. Tap to change.`

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {/* Screen-reader live region for state changes. aria-live on a button
          is non-canonical; pairing the button with an adjacent live region
          is the standard pattern. The visible label inside the button updates
          in lockstep but doesn't itself need to announce. */}
      <span className="sr-only" aria-live="polite">
        Night Mode {stateLabel}
      </span>
      <button
        ref={badgeRef}
        type="button"
        onClick={() => updatePrayerWall({ nightMode: next })}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full',
          'border border-white/[0.12] bg-white/[0.07] backdrop-blur-sm',
          'px-3 py-1.5 text-xs font-medium text-white',
          'min-h-[44px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          'transition-colors',
          'hover:bg-white/[0.12]',
        )}
      >
        <Moon
          className={cn('h-4 w-4', ICON_STATE[userPreference].fillClass)}
          aria-hidden="true"
        />
        {ICON_STATE[userPreference].label && (
          <span className="hidden sm:inline">{ICON_STATE[userPreference].label}</span>
        )}
      </button>

      <button
        type="button"
        onClick={() => setPopoverOpen((p) => !p)}
        aria-label="What is Night Mode?"
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'min-h-[32px] min-w-[32px] p-1',
          'text-white/60 hover:text-white/90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {popoverOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="night-mode-popover-heading"
          className={cn(
            'absolute right-0 top-full mt-2 z-40 w-72',
            'rounded-3xl backdrop-blur-sm p-4',
            'border border-white/[0.18] bg-hero-mid/95',
            'shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
          )}
        >
          <h3
            id="night-mode-popover-heading"
            className="text-base font-semibold text-white"
          >
            Night Mode
          </h3>
          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            Subtle late-night tone changes for the Prayer Wall.
          </p>
          <Link
            to="/settings?tab=privacy#night-mode"
            className="mt-3 inline-block text-sm text-violet-300 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
            onClick={() => setPopoverOpen(false)}
          >
            Change in Settings
          </Link>
        </div>
      )}
    </div>
  )
}
