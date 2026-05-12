import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToastSafe } from '@/components/ui/Toast'
import { SESSIONS_COPY } from '@/constants/sessions-copy'

/**
 * Spec 7 — reads `?auth=login|register` from URL search params, opens
 * AuthModal in the requested view, strips the param via replace nav.
 *
 * Spec 1.5g — also reads `?reason=signed_out_everywhere` (only meaningful
 * when paired with `?auth=login`) and surfaces a whisper-style toast so the
 * user knows why they landed back at the auth modal. The param is stripped
 * after reading.
 *
 * Mounted inside AuthModalProvider AND inside the React Router subtree
 * so both useAuthModal and useSearchParams resolve. See App.tsx for the
 * mount site.
 *
 * Idempotency: the side-effect block (openAuthModal + showToast + navigate)
 * is gated by a useRef sentinel keyed on the matched URL signature. This
 * prevents StrictMode's intentional double-invocation in dev — and any
 * future re-render cascade — from firing the toast more than once per URL.
 * Without the sentinel the signed_out_everywhere flash triplicated in dev
 * (StrictMode mount-double + a re-render triggered by the toast state
 * update itself; see verification report Issue #1).
 *
 * Toast access uses `useToastSafe` because this component is mounted before
 * we can guarantee a ToastProvider is in scope for every render path; the
 * no-op fallback is safer than throwing.
 */
export function AuthQueryParamHandler() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const authModal = useAuthModal()
  const toast = useToastSafe()
  const lastHandledRef = useRef<string | null>(null)

  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth !== 'login' && auth !== 'register') return
    if (!authModal) return

    const reason = searchParams.get('reason')

    // Idempotency key: the full set of params this effect cares about. If we
    // already handled this exact combination, skip — covers StrictMode and
    // any unrelated re-render that doesn't change the URL.
    const signature = `${location.pathname}?auth=${auth}&reason=${reason ?? ''}`
    if (lastHandledRef.current === signature) return
    lastHandledRef.current = signature

    authModal.openAuthModal(undefined, auth)

    // Spec 1.5g — surface signed-out-everywhere reason as a whisper-style toast.
    if (reason === 'signed_out_everywhere') {
      toast.showToast(SESSIONS_COPY.signedOutEverywhereFlash)
    }

    const next = new URLSearchParams(searchParams)
    next.delete('auth')
    next.delete('reason')
    const search = next.toString()
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    )
  }, [searchParams, authModal, navigate, location.pathname, toast])

  return null
}
