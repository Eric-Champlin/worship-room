import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CONFETTI_COLORS } from '@/constants/dashboard/badge-icons'

// --- Types ---

type StandardToastType = 'success' | 'error' | 'warning'
type CelebrationToastType = 'celebration' | 'celebration-confetti' | 'special-celebration'
export type ToastType = StandardToastType | CelebrationToastType

export interface ToastAction {
  label: string
  onClick: () => void
}

interface StandardToast {
  id: number
  message: string
  type: StandardToastType
  action?: ToastAction
}

interface CelebrationToast {
  id: number
  badgeName: string
  message: string
  type: CelebrationToastType
  icon?: ReactNode
}

export interface ToastContextValue {
  showToast: (message: string, type?: StandardToastType, action?: ToastAction) => void
  showCelebrationToast: (
    badgeName: string,
    message: string,
    type: CelebrationToastType,
    icon?: ReactNode,
  ) => Promise<void>
}

// --- Celebration toast auto-dismiss durations ---

const CELEBRATION_DURATIONS: Record<CelebrationToastType, number> = {
  celebration: 4000,
  'celebration-confetti': 5000,
  'special-celebration': 5000,
}

// --- Confetti particle generation (toast burst) ---

function generateToastConfetti(count: number): ReactNode[] {
  return Array.from({ length: count }, (_, i) => {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    const angle = (360 / count) * i
    const distance = 40 + Math.random() * 30
    const endX = Math.cos((angle * Math.PI) / 180) * distance
    const endY = Math.sin((angle * Math.PI) / 180) * distance
    const size = 4 + Math.random() * 2
    const isCircle = i % 2 === 0

    return (
      <span
        key={i}
        className="pointer-events-none absolute animate-confetti-burst motion-reduce:hidden"
        style={
          {
            '--confetti-end': `translate(${endX}px, ${endY}px)`,
            width: size,
            height: size,
            borderRadius: isCircle ? '50%' : '2px',
            backgroundColor: color,
            top: '50%',
            left: '50%',
            animationDelay: `${i * 50}ms`,
          } as React.CSSProperties
        }
        aria-hidden="true"
      />
    )
  })
}

// --- Context ---

const ToastContext = createContext<ToastContextValue | null>(null)

// --- Provider ---

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<StandardToast[]>([])
  const [celebrationToasts, setCelebrationToasts] = useState<CelebrationToast[]>([])
  const nextIdRef = useRef(0)

  const showToast = useCallback((message: string, type: StandardToastType = 'success', action?: ToastAction) => {
    const id = nextIdRef.current++
    setToasts((prev) => {
      const updated = [...prev, { id, message, type, action }]
      return updated.slice(-3)
    })

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }, [])

  // New celebration toast — returns Promise that resolves when dismissed
  const showCelebrationToast = useCallback(
    (
      badgeName: string,
      message: string,
      type: CelebrationToastType,
      icon?: ReactNode,
    ): Promise<void> => {
      return new Promise<void>((resolve) => {
        const id = nextIdRef.current++
        const toast: CelebrationToast = { id, badgeName, message, type, icon }

        setCelebrationToasts((prev) => {
          const updated = [...prev, toast]
          return updated.slice(-3)
        })

        const duration = CELEBRATION_DURATIONS[type]
        setTimeout(() => {
          setCelebrationToasts((prev) => prev.filter((t) => t.id !== id))
          resolve()
        }, duration)
      })
    },
    [],
  )

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <ToastContext.Provider value={{ showToast, showCelebrationToast }}>
      {children}

      {/* Existing standard toasts — top-right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            data-toast-type={toast.type}
            className={cn(
              'animate-slide-from-right rounded-lg border bg-white px-4 py-3 shadow-lg',
              toast.type === 'success'
                ? 'border-l-4 border-l-success'
                : toast.type === 'warning'
                  ? 'border-l-4 border-l-warning'
                  : 'border-l-4 border-l-danger',
            )}
          >
            <div className="flex items-center gap-2">
              <p className="text-sm text-text-dark">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={toast.action.onClick}
                  className="ml-2 shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-lt"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Celebration toasts — bottom */}
      {celebrationToasts.length > 0 && (
        <div
          className={cn(
            'fixed bottom-4 z-50 flex flex-col gap-2',
            isMobile ? 'left-4 right-4 items-center' : 'right-4 sm:max-w-[400px] lg:max-w-[360px]',
          )}
        >
          {celebrationToasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={cn(
                'relative overflow-hidden rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md motion-reduce:animate-none',
                isMobile ? 'animate-slide-from-bottom' : 'animate-slide-from-right',
                toast.type === 'special-celebration' &&
                  'border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]',
              )}
            >
              <div className="flex items-center gap-3">
                {toast.icon && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    {toast.icon}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-sans text-sm font-medium text-white">
                    {toast.badgeName}
                  </p>
                  <p className="font-sans text-xs text-white/70">{toast.message}</p>
                </div>
              </div>

              {/* Confetti burst for celebration-confetti type */}
              {toast.type === 'celebration-confetti' &&
                generateToastConfetti(isMobile ? 6 : 12)}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// --- Hooks ---

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const NOOP_TOAST: ToastContextValue = {
  showToast: () => {},
  showCelebrationToast: async () => {},
}

/**
 * Safe variant of useToast that returns no-ops when outside ToastProvider.
 * Use in components that may render outside the provider tree (e.g., Navbar
 * rendered inside Layout which doesn't always have ToastProvider).
 */
export function useToastSafe(): ToastContextValue {
  const context = useContext(ToastContext)
  return context ?? NOOP_TOAST
}
