import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { getAdjacentChapter } from '@/data/bible'

const ANGLE_THRESHOLD = 30 // degrees
const VELOCITY_THRESHOLD = 0.5 // px/ms

interface UseChapterSwipeOptions {
  bookSlug: string
  currentChapter: number
  enabled: boolean
}

export function useChapterSwipe({ bookSlug, currentChapter, enabled }: UseChapterSwipeOptions) {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isHorizontalRef = useRef<boolean | null>(null)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
      isHorizontalRef.current = null
    },
    [enabled],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !touchStartRef.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y

      // Determine direction on first significant move
      if (isHorizontalRef.current === null) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 10) return // Not enough movement yet

        const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI)
        isHorizontalRef.current = angle <= ANGLE_THRESHOLD
      }

      if (!isHorizontalRef.current) return

      e.preventDefault()
      setIsSwiping(true)
      if (!reducedMotion) {
        setSwipeOffset(dx)
      }
    },
    [enabled, reducedMotion],
  )

  const onTouchEnd = useCallback(() => {
    if (!enabled || !touchStartRef.current || !isHorizontalRef.current) {
      setSwipeOffset(0)
      setIsSwiping(false)
      touchStartRef.current = null
      isHorizontalRef.current = null
      return
    }

    const elapsed = Date.now() - touchStartRef.current.time
    const velocity = Math.abs(swipeOffset) / elapsed
    const viewportThreshold = window.innerWidth * 0.5

    const shouldNavigate =
      Math.abs(swipeOffset) > viewportThreshold || velocity > VELOCITY_THRESHOLD

    if (shouldNavigate) {
      const direction = swipeOffset < 0 ? 'next' : 'prev'
      const target = getAdjacentChapter(bookSlug, currentChapter, direction)
      if (target) {
        navigate(`/bible/${target.bookSlug}/${target.chapter}`)
      }
    }

    setSwipeOffset(0)
    setIsSwiping(false)
    touchStartRef.current = null
    isHorizontalRef.current = null
  }, [enabled, swipeOffset, bookSlug, currentChapter, navigate])

  return {
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    swipeOffset,
    isSwiping,
  }
}
