import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useLegalVersions } from '@/hooks/useLegalVersions'
import { TermsUpdateModal } from './TermsUpdateModal'

interface LegalVersionGateContextValue {
  /**
   * True when the authenticated user's accepted legal versions don't match
   * the current canonical versions. False while loading, when unauthenticated,
   * when versions are still null (legacy users haven't accepted yet — handled
   * by gate as stale), or when user state is missing.
   *
   * Note: A null termsVersion or privacyVersion on the user IS treated as
   * stale (per Spec D8) — the modal will fire to capture acceptance.
   */
  isStaleAcceptance: boolean
  /**
   * Queue an action to replay after a successful accept. The modal will
   * surface (even if previously dismissed this session); on accept, the
   * action fires after user state refreshes. On dismiss, the action drops.
   */
  queueAndShow: (action: () => void) => void
}

const LegalVersionGateContext = createContext<LegalVersionGateContextValue | null>(
  null,
)

/**
 * Spec 1.10f. Provider that wraps the app, exposing `isStaleAcceptance` +
 * `queueAndShow` via context, and rendering the `TermsUpdateModal` overlay
 * when the user's acceptance is stale.
 *
 * Soft enforcement (Master Plan Decision MPD-4): the modal is dismissible
 * "Later" and gated mutations re-show. Browsing remains free regardless of
 * acceptance state.
 */
export function LegalVersionGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, refreshUser } = useAuth()
  const { versions, isLoading } = useLegalVersions()
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const queuedActionRef = useRef<(() => void) | null>(null)

  const isStaleAcceptance = useMemo(() => {
    if (isLoading || !versions) return false
    if (!isAuthenticated || !user) return false
    return (
      user.termsVersion !== versions.termsVersion ||
      user.privacyVersion !== versions.privacyVersion
    )
  }, [isLoading, versions, isAuthenticated, user])

  const showModal = isStaleAcceptance && !sessionDismissed

  const queueAndShow = useCallback((action: () => void) => {
    queuedActionRef.current = action
    // Re-show the modal even if previously dismissed this session — the user
    // is now actively trying to do something gated.
    setSessionDismissed(false)
  }, [])

  const handleAccepted = useCallback(async () => {
    // Refresh user state so AuthUser carries the new versions before the
    // queued action fires (otherwise the action's gate check would still
    // see stale versions on the next render).
    await refreshUser()
    const action = queuedActionRef.current
    queuedActionRef.current = null
    if (action) {
      // Defer to next tick so React commits the user-state update before
      // the action runs.
      window.setTimeout(action, 0)
    }
    setSessionDismissed(true)
  }, [refreshUser])

  const handleDismiss = useCallback(() => {
    queuedActionRef.current = null
    setSessionDismissed(true)
  }, [])

  const value: LegalVersionGateContextValue = useMemo(
    () => ({ isStaleAcceptance, queueAndShow }),
    [isStaleAcceptance, queueAndShow],
  )

  return (
    <LegalVersionGateContext.Provider value={value}>
      {children}
      {showModal && versions && (
        <TermsUpdateModal
          isOpen={showModal}
          versions={versions}
          onAccepted={handleAccepted}
          onDismiss={handleDismiss}
        />
      )}
    </LegalVersionGateContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLegalVersionGate(): LegalVersionGateContextValue {
  const ctx = useContext(LegalVersionGateContext)
  if (!ctx) {
    throw new Error('useLegalVersionGate must be used within LegalVersionGate')
  }
  return ctx
}

/**
 * Provider-optional variant — returns null when the LegalVersionGate provider
 * is not mounted. Used by `useGatedAction` so a feature that consumes a gated
 * action stays renderable in tests/contexts without the full provider stack.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLegalVersionGateOptional(): LegalVersionGateContextValue | null {
  return useContext(LegalVersionGateContext)
}
