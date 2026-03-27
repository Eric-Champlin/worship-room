import { ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface PageTransitionProps {
  children: ReactNode
}

type Phase = 'idle' | 'exiting' | 'entering'

const EXIT_DURATION = 150
const ENTER_DURATION = 200

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('entering')
  const prevKeyRef = useRef(location.key)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    // On initial mount, just enter
    if (prevKeyRef.current === location.key) return

    prevKeyRef.current = location.key

    if (reducedMotion) {
      // Skip animation entirely
      setPhase('idle')
      return
    }

    // Clear any pending timeout from rapid navigation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Start exit phase
    setPhase('exiting')
    timeoutRef.current = setTimeout(() => {
      // After exit completes, start enter phase
      setPhase('entering')
      timeoutRef.current = setTimeout(() => {
        setPhase('idle')
      }, ENTER_DURATION)
    }, EXIT_DURATION)
  }, [location.key, reducedMotion])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (reducedMotion) {
    return <div>{children}</div>
  }

  return (
    <div
      className={
        phase === 'exiting'
          ? 'opacity-0 transition-opacity duration-150 ease-out'
          : phase === 'entering'
            ? 'motion-safe:animate-page-enter'
            : ''
      }
    >
      {children}
    </div>
  )
}
