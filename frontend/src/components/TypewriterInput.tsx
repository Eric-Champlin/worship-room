import { useState, useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PHRASES = [
  "I'm going through a difficult season.",
  "I want to journal but I don't know where to start.",
  "My life is crazy and I don't know how to relax.",
] as const

const TYPING_SPEED_MS = 55
const DELETING_SPEED_MS = 30
const PAUSE_AFTER_COMPLETE_MS = 1800
const PAUSE_BEFORE_NEXT_MS = 500

interface TypewriterInputProps {
  onSubmit: (value: string) => void
}

export function TypewriterInput({ onSubmit }: TypewriterInputProps) {
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState<
    'typing' | 'pausing-complete' | 'deleting' | 'pausing-empty'
  >('typing')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [userValue, setUserValue] = useState('')
  const [ariaAnnouncement, setAriaAnnouncement] = useState('')

  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    if (prefersReducedMotion.current || isFocused) return

    let mounted = true
    const currentPhrase = PHRASES[phraseIndex]

    if (phase === 'typing') {
      if (displayText.length < currentPhrase.length) {
        const timer = setTimeout(() => {
          if (mounted)
            setDisplayText(currentPhrase.slice(0, displayText.length + 1))
        }, TYPING_SPEED_MS)
        return () => {
          mounted = false
          clearTimeout(timer)
        }
      } else {
        setAriaAnnouncement(currentPhrase)
        setPhase('pausing-complete')
      }
    }

    if (phase === 'pausing-complete') {
      const timer = setTimeout(() => {
        if (mounted) setPhase('deleting')
      }, PAUSE_AFTER_COMPLETE_MS)
      return () => {
        mounted = false
        clearTimeout(timer)
      }
    }

    if (phase === 'deleting') {
      if (displayText.length > 0) {
        const timer = setTimeout(() => {
          if (mounted) setDisplayText((prev) => prev.slice(0, -1))
        }, DELETING_SPEED_MS)
        return () => {
          mounted = false
          clearTimeout(timer)
        }
      } else {
        setPhase('pausing-empty')
      }
    }

    if (phase === 'pausing-empty') {
      const timer = setTimeout(() => {
        if (mounted) {
          setPhraseIndex((prev) => (prev + 1) % PHRASES.length)
          setPhase('typing')
        }
      }, PAUSE_BEFORE_NEXT_MS)
      return () => {
        mounted = false
        clearTimeout(timer)
      }
    }
  }, [phase, displayText, phraseIndex, isFocused])

  const handleFocus = () => {
    setIsFocused(true)
    setDisplayText('')
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.currentTarget.value === '') {
      setIsFocused(false)
      setPhase('typing')
      setPhraseIndex(0)
      setDisplayText('')
      setAriaAnnouncement('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = isFocused ? userValue.trim() : displayText.trim()
    if (value) onSubmit(value)
  }

  const inputValue = isFocused ? userValue : displayText

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-xl px-4 sm:px-0"
    >
      <label htmlFor="hero-input" className="sr-only">
        Tell us how you're feeling or what you need
      </label>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaAnnouncement}
      </div>

      <div
        className="animate-glow-pulse rounded-2xl p-[2px]"
        style={{
          background: 'linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)',
        }}
      >
        <div className="flex items-center rounded-[14px] bg-white px-4 py-1">
          <div className="relative flex min-h-[44px] flex-1 items-center">
            <input
              id="hero-input"
              type="text"
              value={inputValue}
              onChange={(e) => {
                if (isFocused) setUserValue(e.target.value)
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={prefersReducedMotion.current ? PHRASES[0] : ''}
              aria-label="Tell us how you're feeling or what you need"
              className="w-full bg-transparent text-base text-text-dark outline-none placeholder:text-text-light"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            aria-label="Submit your question"
            className={cn(
              'ml-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary p-2.5 text-white',
              'transition-colors hover:bg-primary-lt',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  )
}
