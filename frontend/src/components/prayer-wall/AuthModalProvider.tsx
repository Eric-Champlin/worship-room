import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthModal } from './AuthModal'
import { useToast } from '@/components/ui/Toast'

interface AuthModalContextValue {
  openAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const { showToast } = useToast()

  const openAuthModal = useCallback(() => setIsOpen(true), [])
  const closeAuthModal = useCallback(() => setIsOpen(false), [])

  return (
    <AuthModalContext.Provider value={{ openAuthModal }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} onShowToast={showToast} />
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
