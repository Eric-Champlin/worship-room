import { useState, useEffect, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface VerseJumpPillProps {
  totalVerses: number
}

export function VerseJumpPill({ totalVerses }: VerseJumpPillProps) {
  const [visible, setVisible] = useState(false)
  const [verseInput, setVerseInput] = useState('')
  const reducedMotion = useReducedMotion()

  // Observe a sentinel element after verse 20
  useEffect(() => {
    if (totalVerses <= 40) return

    const sentinel = document.getElementById('verse-jump-sentinel')
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show pill when sentinel is above the viewport (user has scrolled past it)
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [totalVerses])

  const handleJump = useCallback(() => {
    const num = parseInt(verseInput, 10)
    if (isNaN(num) || num < 1 || num > totalVerses) return

    const el = document.getElementById(`verse-${num}`)
    if (el) {
      el.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
      setVerseInput('')
    }
  }, [verseInput, totalVerses, reducedMotion])

  if (totalVerses <= 40 || !visible) return null

  return (
    <div
      className="pointer-events-none fixed z-30 transition-opacity duration-base motion-reduce:transition-none"
      style={{
        bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        right: 'max(1.5rem, env(safe-area-inset-right))',
      }}
    >
      <div className="pointer-events-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleJump()
          }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-hero-bg/90 px-3 py-2 shadow-lg backdrop-blur-md"
          aria-label="Jump to verse"
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={totalVerses}
            value={verseInput}
            onChange={(e) => setVerseInput(e.target.value)}
            placeholder="v."
            aria-label="Verse number"
            className="w-12 bg-transparent text-center text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/20 rounded [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="submit"
            className="min-h-[32px] rounded-full bg-white/10 px-3 text-xs font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  )
}

/**
 * Sentinel element to place after verse 20 in the reader body.
 * The VerseJumpPill observes this element's intersection.
 */
export function VerseJumpSentinel() {
  return <span id="verse-jump-sentinel" aria-hidden="true" />
}
