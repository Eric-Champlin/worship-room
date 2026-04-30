import { useCallback } from 'react'
import { useLegalVersionGateOptional } from '@/components/legal/LegalVersionGate'

/**
 * Spec 1.10f. Wraps an action callback so it only fires when the current
 * user's legal acceptance is current. When stale, queues the action and
 * shows the TermsUpdateModal. On successful accept, the queued action
 * replays. On dismiss without accepting, the action drops.
 *
 * Phase 1 consumers: useFriends.sendRequest, useFriends.acceptRequest
 * (per Spec D9). Future specs add their own gates as needed.
 *
 * <p><b>Provider-optional:</b> if `LegalVersionGate` is not mounted (e.g.,
 * tests that render `useFriends` consumers without the full provider stack),
 * the gate degrades to a no-op pass-through and the action fires directly.
 * The gate is additive behavior, not a precondition for the underlying
 * action — wrapping it must not break consumers that don't have the
 * provider.
 */
export function useGatedAction<TArgs extends unknown[]>(
  action: (...args: TArgs) => void,
): (...args: TArgs) => void {
  const gate = useLegalVersionGateOptional()

  return useCallback(
    (...args: TArgs) => {
      if (gate?.isStaleAcceptance) {
        gate.queueAndShow(() => action(...args))
        return
      }
      action(...args)
    },
    [gate, action],
  )
}
