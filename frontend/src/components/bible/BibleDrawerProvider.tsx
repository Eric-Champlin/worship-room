import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { type DrawerView, readStack, writeStack } from '@/lib/bible/drawerStack'

export type { DrawerView }

const DEFAULT_STACK: DrawerView[] = [{ type: 'books' }]

interface BibleDrawerContextValue {
  isOpen: boolean
  open: (initialView?: DrawerView) => void
  close: () => void
  toggle: () => void
  pushView: (view: DrawerView) => void
  popView: () => void
  resetStack: () => void
  currentView: DrawerView
  viewStack: DrawerView[]
  /** Ref to the element that triggered the drawer open (for focus restore) */
  triggerRef: React.MutableRefObject<HTMLElement | null>
  /** Ref to the book slug to focus when popping back to books view */
  returnFocusSlugRef: React.MutableRefObject<string | null>
}

const BibleDrawerContext = createContext<BibleDrawerContextValue | null>(null)

export function BibleDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewStack, setViewStack] = useState<DrawerView[]>(DEFAULT_STACK)
  const triggerRef = useRef<HTMLElement | null>(null)
  const returnFocusSlugRef = useRef<string | null>(null)

  const open = useCallback((initialView?: DrawerView) => {
    if (initialView) {
      // Explicit view: build stack with books base + the requested view
      setViewStack(
        initialView.type === 'books'
          ? [{ type: 'books' }]
          : [{ type: 'books' }, initialView],
      )
    } else {
      // No args: attempt to restore persisted stack within 24h
      const persisted = readStack()
      setViewStack(persisted ?? DEFAULT_STACK)
    }
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Persist current stack for rehydration on next open
    writeStack(viewStack)
  }, [viewStack])

  const toggle = useCallback(() => {
    if (isOpen) {
      writeStack(viewStack)
      setIsOpen(false)
    } else {
      const persisted = readStack()
      setViewStack(persisted ?? DEFAULT_STACK)
      setIsOpen(true)
    }
  }, [isOpen, viewStack])

  const pushView = useCallback((view: DrawerView) => {
    setViewStack((prev) => [...prev, view])
  }, [])

  const popView = useCallback(() => {
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const resetStack = useCallback(() => {
    setViewStack(DEFAULT_STACK)
  }, [])

  const currentView = viewStack[viewStack.length - 1]

  return (
    <BibleDrawerContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        pushView,
        popView,
        resetStack,
        currentView,
        viewStack,
        triggerRef,
        returnFocusSlugRef,
      }}
    >
      {children}
    </BibleDrawerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + context hook export is standard React pattern
export function useBibleDrawer() {
  const ctx = useContext(BibleDrawerContext)
  if (!ctx) throw new Error('useBibleDrawer must be used within BibleDrawerProvider')
  return ctx
}
