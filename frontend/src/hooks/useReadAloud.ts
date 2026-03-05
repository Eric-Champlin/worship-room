import { useState, useCallback, useRef, useEffect } from 'react'

export type ReadAloudState = 'idle' | 'playing' | 'paused'

interface UseReadAloudReturn {
  state: ReadAloudState
  currentWordIndex: number
  play: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

export function useReadAloud(): UseReadAloudReturn {
  const [state, setState] = useState<ReadAloudState>('idle')
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const wordCountRef = useRef(0)

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    wordCountRef.current = 0
    setState('idle')
    setCurrentWordIndex(-1)
  }, [])

  const play = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return

      // Stop any current speech
      stop()

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance
      wordCountRef.current = 0

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          setCurrentWordIndex(wordCountRef.current)
          wordCountRef.current++
        }
      }

      utterance.onend = () => {
        setState('idle')
        setCurrentWordIndex(-1)
        wordCountRef.current = 0
      }

      utterance.onerror = () => {
        setState('idle')
        setCurrentWordIndex(-1)
        wordCountRef.current = 0
      }

      window.speechSynthesis.speak(utterance)
      setState('playing')
    },
    [stop],
  )

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
      setState('paused')
    }
  }, [])

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
      setState('playing')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return { state, currentWordIndex, play, pause, resume, stop }
}
