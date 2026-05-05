import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'

/**
 * Spec 7 — reads `?auth=login|register` from URL search params, opens
 * AuthModal in the requested view, strips the param via replace nav.
 *
 * Mounted inside AuthModalProvider AND inside the React Router subtree
 * so both useAuthModal and useSearchParams resolve. See App.tsx for the
 * mount site.
 */
export function AuthQueryParamHandler() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const authModal = useAuthModal()

  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth !== 'login' && auth !== 'register') return
    if (!authModal) return

    authModal.openAuthModal(undefined, auth)

    const next = new URLSearchParams(searchParams)
    next.delete('auth')
    const search = next.toString()
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    )
  }, [searchParams, authModal, navigate, location.pathname])

  return null
}
