import { useState, useRef } from 'react'
import { Moon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

interface NightWatchChipProps {
  /** From useNightMode().source — adds "(always on)" subtitle when 'manual'. */
  source: 'auto' | 'manual'
}

/**
 * Spec 6.3 — Night Watch chip.
 *
 * Renders in the PrayerWall hero action slot when night mode is active.
 * Click opens a focus-trapped popover explaining night mode and linking to
 * Settings. `useFocusTrap` restores focus to the chip on close (W26).
 */
export function NightWatchChip({ source }: NightWatchChipProps) {
  const [open, setOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useFocusTrap(open, () => setOpen(false))

  const ariaLabel =
    source === 'manual' ? 'Night Mode active (always on)' : 'Night Mode active'

  return (
    <div className="relative inline-block">
      <button
        ref={chipRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex items-center gap-2 rounded-full',
          'border border-[var(--pw-night-border-strong)] bg-[var(--pw-night-bg-elev)]',
          'px-3 py-1.5 text-sm text-[var(--pw-night-text)]',
          'min-h-[44px] min-w-[44px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-night-accent)]/60',
          'transition-colors',
        )}
      >
        <Moon
          className="h-4 w-4 motion-safe:animate-night-pulse"
          aria-hidden="true"
        />
        <span>Night Mode</span>
        {source === 'manual' && (
          <span className="text-xs text-[var(--pw-night-text-muted)]">
            (always on)
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="night-watch-popover-heading"
          className={cn(
            'absolute right-0 top-full mt-2 z-40 w-72',
            'rounded-3xl backdrop-blur-sm p-4',
            'border border-[var(--pw-night-border-strong)] bg-[var(--pw-night-bg-elev)]',
            'shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
          )}
        >
          <h3
            id="night-watch-popover-heading"
            className="text-base font-semibold text-[var(--pw-night-text)]"
          >
            Night Mode
          </h3>
          <p className="mt-2 text-sm text-[var(--pw-night-text-muted)] leading-relaxed">
            The Prayer Wall is quieter at night. Same posts; gentler palette.
          </p>
          <Link
            to="/settings?tab=privacy#night-mode"
            className={cn(
              'mt-3 inline-block text-sm',
              'text-[var(--pw-night-accent)] hover:underline',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-night-accent)]/60',
              'rounded',
            )}
            onClick={() => setOpen(false)}
          >
            Change in Settings
          </Link>
        </div>
      )}
    </div>
  )
}
