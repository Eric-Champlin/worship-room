import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthModal } from './AuthModal'
import { useToast } from '@/components/ui/Toast'

interface AuthModalContextValue {
  openAuthModal: (subtitle?: string, initialView?: 'login' | 'register') => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [subtitle, setSubtitle] = useState<string | undefined>()
  const [initialView, setInitialView] = useState<'login' | 'register'>('login')
  const { showToast } = useToast()

  const openAuthModal = useCallback((sub?: string, view?: 'login' | 'register') => {
    setSubtitle(sub)
    setInitialView(view ?? 'login')
    setIsOpen(true)
  }, [])
  const closeAuthModal = useCallback(() => {
    setIsOpen(false)
    setSubtitle(undefined)
    setInitialView('login')
  }, [])

  return (
    <AuthModalContext.Provider value={{ openAuthModal }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} onShowToast={showToast} subtitle={subtitle} initialView={initialView} />
    </AuthModalContext.Provider>
  )
}

/**
 * Returns the auth modal context. When used outside an AuthModalProvider
 * (e.g. PrayerDetail which has no provider), returns undefined so callers
 * can fall back to a regular link.
 */
export function useAuthModal(): AuthModalContextValue | undefined {
  return useContext(AuthModalContext) ?? undefined
}
