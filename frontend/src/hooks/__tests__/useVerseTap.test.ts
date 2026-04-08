import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVerseTap } from '../useVerseTap'
import type { BibleVerse } from '@/types/bible'

// Polyfill PointerEvent for jsdom
class MockPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string
  constructor(type: string, init?: PointerEventInit & EventInit) {
    super(type, init)
    this.pointerId = init?.pointerId ?? 0
    this.pointerType = init?.pointerType ?? 'mouse'
  }
}
if (typeof globalThis.PointerEvent === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).PointerEvent = MockPointerEvent
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_VERSES: BibleVerse[] = [
  { number: 16, text: 'For God so loved the world...' },
  { number: 17, text: "For God didn't send his Son..." },
  { number: 18, text: "He who believes in him..." },
  { number: 19, text: 'This is the judgment...' },
  { number: 20, text: 'For everyone who does evil...' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createContainer(): HTMLDivElement {
  const container = document.createElement('div')
  TEST_VERSES.forEach((v) => {
    const span = document.createElement('span')
    span.setAttribute('data-verse', String(v.number))
    span.setAttribute('data-book', 'john')
    span.setAttribute('data-chapter', '3')
    span.id = `verse-${v.number}`
    span.textContent = v.text
    container.appendChild(span)
  })
  document.body.appendChild(container)
  return container
}

function simulateQuickTap(target: HTMLElement, options?: Partial<PointerEvent>) {
  const rect = target.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2

  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: x,
      clientY: y,
      ...options,
    }),
  )
  target.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      clientX: x,
      clientY: y,
      ...options,
    }),
  )
}

function defaultOptions(container: HTMLDivElement) {
  return {
    containerRef: { current: container },
    bookSlug: 'john',
    bookName: 'John',
    chapter: 3,
    verses: TEST_VERSES,
    enabled: true,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useVerseTap', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    container = createContainer()
    // Mock history.pushState and history.back
    vi.spyOn(history, 'pushState').mockImplementation(() => {})
    vi.spyOn(history, 'back').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('returns null selection initially', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    expect(result.current.selection).toBeNull()
    expect(result.current.isSheetOpen).toBe(false)
  })

  it('quick tap on verse opens sheet', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verseSpan = container.querySelector('[data-verse="16"]')!

    act(() => {
      simulateQuickTap(verseSpan as HTMLElement)
    })

    expect(result.current.isSheetOpen).toBe(true)
    expect(result.current.selection).not.toBeNull()
    expect(result.current.selection!.startVerse).toBe(16)
    expect(result.current.selection!.endVerse).toBe(16)
    expect(result.current.selection!.bookName).toBe('John')
  })

  it('tap on non-verse element is no-op', () => {
    // Add a non-verse element
    const heading = document.createElement('h2')
    heading.textContent = 'Chapter 3'
    container.prepend(heading)

    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))

    act(() => {
      simulateQuickTap(heading)
    })

    expect(result.current.selection).toBeNull()
    expect(result.current.isSheetOpen).toBe(false)
  })

  it('tap with text selection is no-op', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verseSpan = container.querySelector('[data-verse="16"]')!

    // Mock window.getSelection to return non-empty
    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'selected text',
    } as Selection)

    act(() => {
      simulateQuickTap(verseSpan as HTMLElement)
    })

    expect(result.current.isSheetOpen).toBe(false)
  })

  it('long press opens sheet', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      verseSpan.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50 }),
      )
    })

    // Advance past long-press delay
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.isSheetOpen).toBe(true)
    expect(result.current.selection!.startVerse).toBe(16)
  })

  it('long press cancelled by movement', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      verseSpan.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50 }),
      )
    })

    // Move more than 10px
    act(() => {
      container.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 70, clientY: 50 }),
      )
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.isSheetOpen).toBe(false)
  })

  it('multi-verse extends range', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan)
    })

    expect(result.current.selection!.startVerse).toBe(16)
    expect(result.current.selection!.endVerse).toBe(16)

    act(() => {
      result.current.extendSelection(18)
    })

    expect(result.current.selection!.startVerse).toBe(16)
    expect(result.current.selection!.endVerse).toBe(18)
    expect(result.current.selection!.verses).toHaveLength(3)
  })

  it('shift+click extends range', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verse16 = container.querySelector('[data-verse="16"]') as HTMLElement
    const verse20 = container.querySelector('[data-verse="20"]') as HTMLElement

    act(() => {
      simulateQuickTap(verse16)
    })

    expect(result.current.isSheetOpen).toBe(true)

    act(() => {
      simulateQuickTap(verse20, { shiftKey: true })
    })

    expect(result.current.selection!.startVerse).toBe(16)
    expect(result.current.selection!.endVerse).toBe(20)
  })

  it('closeSheet clears selection', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan)
    })

    expect(result.current.isSheetOpen).toBe(true)

    act(() => {
      result.current.closeSheet()
    })

    expect(result.current.selection).toBeNull()
    expect(result.current.isSheetOpen).toBe(false)
  })

  it('does not fire when disabled', () => {
    const opts = { ...defaultOptions(container), enabled: false }
    const { result } = renderHook(() => useVerseTap(opts))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan)
    })

    expect(result.current.isSheetOpen).toBe(false)
  })

  it('browser back closes sheet', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan)
    })

    expect(result.current.isSheetOpen).toBe(true)

    // Simulate browser back (popstate without verseSheet state)
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    })

    expect(result.current.isSheetOpen).toBe(false)
    expect(result.current.selection).toBeNull()
  })
})
