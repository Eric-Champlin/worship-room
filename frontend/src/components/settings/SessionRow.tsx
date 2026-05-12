import { Globe, Monitor, Smartphone } from 'lucide-react'

import { SESSIONS_COPY } from '@/constants/sessions-copy'
import { timeAgo } from '@/lib/time'
import type { Session } from '@/types/api/sessions'

interface SessionRowProps {
  session: Session
  /** Called when the user clicks "Sign out" for this row. */
  onRevoke: () => void
  /** Disables the revoke button while a revoke is in flight. */
  isRevoking?: boolean
}

/**
 * Spec 1.5g — one row in the /settings/sessions list.
 *
 * Renders the parsed device label, the city (or "Unknown location"), the
 * relative last-seen time, the "This device" badge when applicable, and a
 * Sign Out button. Layout uses a FrostedCard-tier default surface.
 */
export function SessionRow({ session, onRevoke, isRevoking = false }: SessionRowProps) {
  const deviceLabel = session.deviceLabel ?? SESSIONS_COPY.unknownDevice
  const location = session.ipCity ?? SESSIONS_COPY.unknownLocation
  const Icon = pickIcon(deviceLabel)

  return (
    <div
      className="flex items-start gap-4 rounded-3xl border border-white/[0.12] bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5"
      aria-label={SESSIONS_COPY.ariaSessionRow}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-white sm:text-base">
            {deviceLabel}
          </span>
          {session.isCurrent && (
            <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-200">
              {SESSIONS_COPY.thisDevice}
            </span>
          )}
        </div>
        <div className="text-xs text-white/70 sm:text-sm">
          {location} · Last active {timeAgo(session.lastSeenAt)}
        </div>
      </div>

      <button
        type="button"
        onClick={onRevoke}
        disabled={isRevoking}
        className="min-h-[44px] shrink-0 rounded-full border border-red-400/30 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-50"
      >
        {SESSIONS_COPY.signOutThis}
      </button>
    </div>
  )
}

function pickIcon(deviceLabel: string) {
  const lower = deviceLabel.toLowerCase()
  if (lower.includes('ios') || lower.includes('iphone') || lower.includes('android')) {
    return Smartphone
  }
  if (lower.includes('mac') || lower.includes('windows') || lower.includes('linux')) {
    return Monitor
  }
  return Globe
}
