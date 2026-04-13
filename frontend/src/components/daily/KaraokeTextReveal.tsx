import { useEffect, useRef, useState } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'

interface KaraokeTextRevealProps {
  text: string
  /** Total time (ms) for the full reveal. Mutually exclusive with msPerWord. */
  revealDuration?: number
  /** Per-word delay (ms). Used for variable-length reveals (Scripture Soaking). Mutually exclusive with revealDuration. */
  msPerWord?: number
  /** Fired after the last word is fully revealed */
  onRevealComplete?: () => void
  /** When set to true, instantly reveals all words and fires onRevealComplete */
  forceComplete?: boolean
  /** Applied to the container element for font styling inheritance */
  className?: string
}

const DEFAULT_REVEAL_DURATION = 2500

export function KaraokeTextReveal({
  text,
  revealDuration,
  msPerWord,
  onRevealComplete,
  forceComplete,
  className,
}: KaraokeTextRevealProps) {
  const prefersReduced = useReducedMotion()
  const [revealedCount, setRevealedCount] = useState(0)
  const lastTextRef = useRef<string>('')
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const completeCallbackRef = useRef(onRevealComplete)

  // Keep callback ref in sync
  completeCallbackRef.current = onRevealComplete

  const words = text ? text.split(/\s+/) : []

  useEffect(() => {
    if (!text) return

    // Same text — do not restart reveal
    if (lastTextRef.current === text) return
    lastTextRef.current = text

    // Clear any existing timeouts
    timeoutIdsRef.current.forEach(clearTimeout)
    timeoutIdsRef.current = []

    const currentWords = text.split(/\s+/)

    if (prefersReduced) {
      setRevealedCount(currentWords.length)
      const id = setTimeout(() => completeCallbackRef.current?.(), 0)
      timeoutIdsRef.current.push(id)
      return
    }

    setRevealedCount(0)

    const perWordDelay = msPerWord
      ? msPerWord
      : (revealDuration ?? DEFAULT_REVEAL_DURATION) / currentWords.length

    for (let i = 0; i < currentWords.length; i++) {
      const id = setTimeout(() => {
        setRevealedCount(i + 1)
      }, perWordDelay * (i + 1))
      timeoutIdsRef.current.push(id)
    }

    // Fire onRevealComplete after last word
    const completeId = setTimeout(() => {
      completeCallbackRef.current?.()
    }, perWordDelay * currentWords.length + 200)
    timeoutIdsRef.current.push(completeId)

    return () => {
      timeoutIdsRef.current.forEach(clearTimeout)
      timeoutIdsRef.current = []
      lastTextRef.current = ''
    }
  }, [text, prefersReduced, msPerWord, revealDuration])

  // Force-complete: instantly reveal all words and fire callback
  useEffect(() => {
    if (forceComplete && text) {
      const currentWords = text.split(/\s+/)
      timeoutIdsRef.current.forEach(clearTimeout)
      timeoutIdsRef.current = []
      setRevealedCount(currentWords.length)
      const id = setTimeout(() => completeCallbackRef.current?.(), 0)
      timeoutIdsRef.current.push(id)
    }
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout)
      timeoutIdsRef.current = []
    }
  }, [forceComplete, text])

  if (!text) return null

  return (
    <span className={cn(className)}>
      {words.map((word, index) => (
        <span
          key={`${index}-${word}`}
          style={{
            opacity: index < revealedCount ? 1 : 0,
            transform: index < revealedCount ? 'translateY(0)' : 'translateY(4px)',
            transition: `opacity ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}, transform ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}`,
            display: 'inline',
          }}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}
