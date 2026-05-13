import { useCallback, useState } from 'react'

import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import type {
  QuickLiftCompleteResponse,
  QuickLiftSessionState,
  QuickLiftStartResponse,
} from '@/types/quickLift'

// Spec 6.2 — orchestrates the Quick Lift session state machine. State lives in
// component memory only (no reactive store) — sessions are server-side and
// short-lived (30 s typical, 5-min TTL).

interface ApiEnvelope<T> {
  data: T
  meta: { requestId: string }
}

function friendlyStartMessage(code: string | undefined): string {
  switch (code) {
    case 'ACTIVE_SESSION_EXISTS':
      return "You've already started a Quick Lift on this post — finish that one first."
    case 'QUICK_LIFT_START_RATE_LIMITED':
      return 'Please slow down. Try again in a moment.'
    case 'NOT_FOUND':
      return "We couldn't find that post."
    default:
      return "We couldn't start that. Please try again."
  }
}

function friendlyCompleteMessage(code: string | undefined): string {
  switch (code) {
    case 'TIMING_TOO_EARLY':
      return 'Almost there. Give it the full 30 seconds.'
    case 'ALREADY_COMPLETED':
      return 'This Quick Lift is already done.'
    case 'FORBIDDEN':
      return "This Quick Lift isn't yours to complete."
    case 'QUICK_LIFT_COMPLETE_RATE_LIMITED':
      return 'Please slow down. Try again in a moment.'
    default:
      return "We couldn't complete that. Please try again."
  }
}

export function useQuickLift(postId: string) {
  const [state, setState] = useState<QuickLiftSessionState>({ phase: 'idle' })

  const start = useCallback(async () => {
    setState({ phase: 'starting' })
    try {
      const res = await apiFetch<ApiEnvelope<QuickLiftStartResponse>>(
        '/api/v1/quick-lift/start',
        { method: 'POST', body: JSON.stringify({ postId }) },
      )
      const serverStartedAt = new Date(res.data.serverStartedAt).getTime()
      setState({
        phase: 'running',
        sessionId: res.data.sessionId,
        serverStartedAt,
      })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'NETWORK_ERROR'
      setState({ phase: 'error', code, message: friendlyStartMessage(code) })
    }
  }, [postId])

  const complete = useCallback(async (sessionId: string) => {
    setState({ phase: 'completing', sessionId })
    try {
      const res = await apiFetch<ApiEnvelope<QuickLiftCompleteResponse>>(
        `/api/v1/quick-lift/${sessionId}/complete`,
        { method: 'POST' },
      )
      setState({ phase: 'complete', response: res.data })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'NETWORK_ERROR'
      setState({ phase: 'error', code, message: friendlyCompleteMessage(code) })
    }
  }, [])

  const reset = useCallback(() => setState({ phase: 'idle' }), [])

  return { state, start, complete, reset }
}
