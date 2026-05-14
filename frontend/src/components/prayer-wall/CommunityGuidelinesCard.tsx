import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'wr_prayer_wall_guidelines_dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // private mode / quota — graceful no-op
  }
}

/**
 * Prayer Wall Redesign (2026-05-13) — Community Guidelines card for the
 * right sidebar. Collapsed by default. Tapping the header expands the body.
 * The "Got it" button writes wr_prayer_wall_guidelines_dismissed = 'true'
 * so the card never returns on subsequent loads.
 */
export function CommunityGuidelinesCard() {
  // CSR-only Vite SPA — no SSR/hydration. The lazy initializer reads
  // localStorage on first render, which is the canonical "load once on mount"
  // pattern for this codebase.
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())
  const [expanded, setExpanded] = useState(false)

  if (dismissed) return null

  return (
    <FrostedCard variant="default" as="section" aria-labelledby="cg-heading">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="cg-body"
        className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
      >
        <h3 id="cg-heading" className="text-sm font-semibold text-white">
          Welcome to Prayer Wall
        </h3>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-white/60 transition-transform duration-base',
            expanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div id="cg-body" className="mt-3">
          <p className="text-sm text-white/70 leading-relaxed">
            This is a place for prayer, honest conversation, and presence with
            one another. Posts can be public, friends-only, or anonymous. We
            keep it kind and real.
          </p>
          <button
            type="button"
            onClick={() => {
              writeDismissed()
              setDismissed(true)
            }}
            className="mt-3 text-sm text-violet-300 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded min-h-[44px] py-2"
            aria-label="Dismiss community guidelines card"
          >
            Got it (don&apos;t show again)
          </button>
        </div>
      )}
    </FrostedCard>
  )
}
