import { useCallback, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Laptop2 } from 'lucide-react'

import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { SEO } from '@/components/SEO'
import { SessionRow } from '@/components/settings/SessionRow'
import { SignOutEverywhereDialog } from '@/components/settings/SignOutEverywhereDialog'
import { SESSIONS_COPY } from '@/constants/sessions-copy'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { useAuth } from '@/hooks/useAuth'
import { useSessions } from '@/hooks/useSessions'
import { useToast } from '@/components/ui/Toast'
import { clearStoredToken } from '@/lib/auth-storage'

/**
 * Spec 1.5g — `/settings/sessions` page.
 *
 * Displays the user's active sessions with revoke actions. Anti-pressure
 * voice throughout — no surveillance framing, no urgency, no exclamation
 * points. All user-facing strings live in `sessions-copy.ts`.
 *
 * Sign-out-everywhere → clear local token + navigate to `/?auth=login&reason=signed_out_everywhere`
 * so AuthQueryParamHandler opens the AuthModal with a flash message.
 *
 * Auth gating: the outer `SessionsPage` does the auth check, the inner
 * `SessionsPageContent` does the work. This split exists because `useSessions`
 * fires `GET /api/v1/sessions` on mount — running it during the JWT-resolving
 * window (when `wr_jwt_token` is set but `/users/me` hasn't returned yet) would
 * 401 and trigger a spurious logout. Rendering the skeleton while
 * `isAuthResolving` is true defers the API call until the auth state settles
 * AND prevents the brief bounce through `/?auth=login` that the previous
 * single-component implementation exhibited on every page reload.
 */
export function SessionsPage() {
  const { isAuthenticated, isAuthResolving } = useAuth()

  if (isAuthResolving) {
    return <SessionsPageSkeleton />
  }
  if (!isAuthenticated) {
    return <Navigate to="/?auth=login" replace />
  }
  return <SessionsPageContent />
}

function SessionsPageContent() {
  const { sessions, loading, error, revoke, revokeOthers, revokeAll } = useSessions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [confirmEverywhereOpen, setConfirmEverywhereOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const handleRevoke = useCallback(
    async (sessionId: string, isCurrent: boolean) => {
      setRevokingId(sessionId)
      const ok = await revoke(sessionId)
      setRevokingId(null)
      if (!ok) return // error surfaced via `error` state
      if (isCurrent) {
        // Revoking THIS device — same redirect as "Sign out everywhere".
        clearStoredToken()
        navigate('/?auth=login&reason=signed_out_everywhere', { replace: true })
      } else {
        showToast(SESSIONS_COPY.signedOutToast)
      }
    },
    [revoke, navigate, showToast],
  )

  const handleRevokeOthers = useCallback(async () => {
    const ok = await revokeOthers()
    if (ok) {
      showToast(SESSIONS_COPY.signedOutToast)
    }
  }, [revokeOthers, showToast])

  const handleRevokeAllConfirm = useCallback(async () => {
    setConfirmEverywhereOpen(false)
    await revokeAll()
    // Proceed with the redirect regardless of success — the server-side revoke
    // may have committed before the response failed; the safe move is to clear
    // the local token and route through auth.
    clearStoredToken()
    navigate('/?auth=login&reason=signed_out_everywhere', { replace: true })
  }, [revokeAll, navigate])

  const hasMultipleSessions = sessions.length > 1

  return (
    <div className="min-h-screen bg-dashboard-dark" style={ATMOSPHERIC_HERO_BG}>
      <SEO
        title="Active sessions — Worship Room"
        description="Manage where you're signed in. Review your active sessions and sign out devices you no longer use."
      />
      <Navbar />

      <main id="main" className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 sm:pt-32">
        <Link
          to="/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to settings
        </Link>

        <h1
          className="mb-2 text-3xl font-bold sm:text-4xl"
          style={GRADIENT_TEXT_STYLE}
        >
          {SESSIONS_COPY.pageTitle}
        </h1>
        <p className="mb-8 text-white/70 sm:text-lg">{SESSIONS_COPY.pageSubtitle}</p>

        {/* Action buttons — above the list */}
        {hasMultipleSessions && (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRevokeOthers}
              className="min-h-[44px] rounded-full border border-white/[0.12] bg-white/[0.07] px-5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/[0.20] hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {SESSIONS_COPY.signOutOthers}
            </button>
            <button
              type="button"
              onClick={() => setConfirmEverywhereOpen(true)}
              className="min-h-[44px] rounded-full border border-red-400/30 bg-red-950/30 px-5 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            >
              {SESSIONS_COPY.signOutEverywhere}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Loading sessions</span>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-3xl border border-white/[0.12] bg-white/[0.04]"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-3xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100"
          >
            {error}
          </div>
        )}

        {/* Empty state — only the current session */}
        {!loading && !error && sessions.length <= 1 && (
          <FeatureEmptyState
            icon={Laptop2}
            heading="Just this device"
            description={SESSIONS_COPY.emptyState}
          />
        )}

        {/* Sessions list */}
        {!loading && !error && sessions.length > 1 && (
          <ul className="space-y-3" aria-live="polite">
            {sessions.map((session) => (
              <li key={session.sessionId}>
                <SessionRow
                  session={session}
                  onRevoke={() => handleRevoke(session.sessionId, session.isCurrent)}
                  isRevoking={revokingId === session.sessionId}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <SignOutEverywhereDialog
        isOpen={confirmEverywhereOpen}
        onClose={() => setConfirmEverywhereOpen(false)}
        onConfirm={handleRevokeAllConfirm}
      />

      <SiteFooter />
    </div>
  )
}

/**
 * Renders the page chrome with skeleton row placeholders while the parent
 * auth state is still resolving. Crucially does NOT call `useSessions` — that
 * would 401 against a not-yet-attached Bearer header. Visually identical to
 * the content component's loading branch so the transition to the real list
 * is seam-free.
 */
function SessionsPageSkeleton() {
  return (
    <div className="min-h-screen bg-dashboard-dark" style={ATMOSPHERIC_HERO_BG}>
      <Navbar />
      <main
        id="main"
        className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:px-6 sm:pt-32"
        aria-busy="true"
      >
        <span className="sr-only">Loading active sessions</span>
        <div className="mb-6 h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
        <div className="mb-2 h-10 w-64 animate-pulse rounded bg-white/[0.08]" />
        <div className="mb-8 h-5 w-48 animate-pulse rounded bg-white/[0.06]" />
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-3xl border border-white/[0.12] bg-white/[0.04]"
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default SessionsPage
