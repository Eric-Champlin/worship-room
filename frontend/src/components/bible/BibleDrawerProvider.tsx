import { createContext, useContext, useState, useCallback, useRef } from 'react'

interface BibleDrawerContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  /** Ref to the element that triggered the drawer open (for focus restore) */
  triggerRef: React.MutableRefObject<HTMLElement | null>
}

const BibleDrawerContext = createContext<BibleDrawerContextValue | null>(null)

export function BibleDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <BibleDrawerContext.Provider value={{ isOpen, open, close, toggle, triggerRef }}>
      {children}
    </BibleDrawerContext.Provider>
  )
}

export function useBibleDrawer() {
  const ctx = useContext(BibleDrawerContext)
  if (!ctx) throw new Error('useBibleDrawer must be used within BibleDrawerProvider')
  return ctx
}
