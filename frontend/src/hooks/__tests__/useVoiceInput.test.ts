import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceInput } from '../useVoiceInput'

// --- Mock SpeechRecognition ---

let lastInstance: InstanceType<typeof MockSpeechRecognition> | null = null

class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastInstance = this
  }
}

function installMock() {
  Object.defineProperty(window, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })
}

describe('useVoiceInput', () => {
  beforeEach(() => {
    lastInstance = null
    installMock()
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  })

  it('returns isSupported=false when SpeechRecognition not available', () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition

    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    expect(result.current.isSupported).toBe(false)
  })

  it('returns isSupported=true when SpeechRecognition available', () => {
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    expect(result.current.isSupported).toBe(true)
  })

  it('returns isSupported=true when webkitSpeechRecognition available', () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    expect(result.current.isSupported).toBe(true)
  })

  it('startListening creates recognition and calls start()', () => {
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    act(() => {
      result.current.startListening()
    })

    expect(result.current.isListening).toBe(true)
    expect(lastInstance).not.toBeNull()
    expect(lastInstance!.start).toHaveBeenCalled()
    expect(lastInstance!.continuous).toBe(true)
    expect(lastInstance!.interimResults).toBe(true)
    expect(lastInstance!.lang).toBe('en-US')
  })

  it('stopListening stops recognition', () => {
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!

    act(() => {
      result.current.stopListening()
    })

    expect(recognition.stop).toHaveBeenCalled()
    expect(result.current.isListening).toBe(false)
  })

  it('calls onTranscript with final transcript text', () => {
    const onTranscript = vi.fn()

    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: 'Hello world' },
          },
        },
      })
    })

    expect(onTranscript).toHaveBeenCalledWith('Hello world')
  })

  it('calls onInterimUpdate with interim text', () => {
    const onTranscript = vi.fn()
    const onInterimUpdate = vi.fn()

    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript, onInterimUpdate }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: false,
            0: { transcript: 'Hello wor' },
          },
        },
      })
    })

    expect(onInterimUpdate).toHaveBeenCalledWith('Hello wor')
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('sets isPermissionDenied on not-allowed error', () => {
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!

    act(() => {
      recognition.onerror?.({ error: 'not-allowed' })
    })

    expect(result.current.isPermissionDenied).toBe(true)
    expect(result.current.isListening).toBe(false)
  })

  it('returns to idle on other errors without setting permission denied', () => {
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!

    act(() => {
      recognition.onerror?.({ error: 'network' })
    })

    expect(result.current.isPermissionDenied).toBe(false)
    expect(result.current.isListening).toBe(false)
  })

  it('truncates transcript when maxLength reached and calls onMaxLengthReached', () => {
    const onTranscript = vi.fn()
    const onMaxLengthReached = vi.fn()

    const { result } = renderHook(() =>
      useVoiceInput({
        onTranscript,
        maxLength: 5,
        onMaxLengthReached,
      }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: 'Hello world this is long' },
          },
        },
      })
    })

    expect(onTranscript).toHaveBeenCalledWith('Hello')
    expect(onMaxLengthReached).toHaveBeenCalled()
    expect(result.current.isListening).toBe(false)
  })

  it('cleans up on unmount by calling abort', () => {
    const { result, unmount } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!
    unmount()

    expect(recognition.abort).toHaveBeenCalled()
  })

  it('concatenates multiple final results with spaces', () => {
    const onTranscript = vi.fn()

    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript }),
    )

    act(() => {
      result.current.startListening()
    })

    const recognition = lastInstance!

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 2,
          0: {
            isFinal: true,
            0: { transcript: 'Hello' },
          },
          1: {
            isFinal: true,
            0: { transcript: 'world' },
          },
        },
      })
    })

    expect(onTranscript).toHaveBeenCalledWith('Hello world')
  })

  it('sets isListening to false when recognition ends naturally', () => {
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn() }),
    )

    act(() => {
      result.current.startListening()
    })

    expect(result.current.isListening).toBe(true)

    const recognition = lastInstance!

    act(() => {
      recognition.onend?.()
    })

    expect(result.current.isListening).toBe(false)
  })
})
