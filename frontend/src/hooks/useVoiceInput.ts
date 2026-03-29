import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void
  onInterimUpdate?: (interim: string) => void
  maxLength?: number
  onMaxLengthReached?: () => void
}

interface UseVoiceInputReturn {
  isSupported: boolean
  isListening: boolean
  isPermissionDenied: boolean
  startListening: () => void
  stopListening: () => void
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionEvent = {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as Record<string, unknown>
  if (typeof w.SpeechRecognition === 'function') {
    return w.SpeechRecognition as new () => SpeechRecognitionInstance
  }
  if (typeof w.webkitSpeechRecognition === 'function') {
    return w.webkitSpeechRecognition as new () => SpeechRecognitionInstance
  }
  return null
}

export function useVoiceInput(options: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isPermissionDenied, setIsPermissionDenied] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const permissionDeniedRef = useRef(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    setIsSupported(getSpeechRecognitionConstructor() !== null)
  }, [])

  const startListening = useCallback(() => {
    if (permissionDeniedRef.current) return

    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) return

    // Abort any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (_e) {
        // ignore
      }
    }

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const { onTranscript: onT, onInterimUpdate: onI, maxLength: ml, onMaxLengthReached: onMax } =
        optionsRef.current

      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          finalText += (finalText ? ' ' : '') + transcript
        } else {
          interimText += transcript
        }
      }

      if (interimText) {
        onI?.(interimText)
      }

      if (finalText) {
        // Check max length
        if (ml !== undefined && ml !== null && finalText.length > ml) {
          const truncated = finalText.slice(0, ml)
          if (truncated) onT(truncated)
          onMax?.()
          recognition.stop()
          setIsListening(false)
          return
        }

        onT(finalText)
      }
    }

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'not-allowed') {
        permissionDeniedRef.current = true
        setIsPermissionDenied(true)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (_e) {
        // ignore
      }
    }
    setIsListening(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (_e) {
          // ignore
        }
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    isPermissionDenied,
    startListening,
    stopListening,
  }
}
