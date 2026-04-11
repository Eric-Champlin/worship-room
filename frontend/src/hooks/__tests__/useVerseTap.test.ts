import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVerseTap, computeExtendedRange } from '../useVerseTap'
import type { BibleVerse } from '@/types/bible'
import type { VerseRange } from '@/lib/url/parseVerseParam'

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
  { number: 18, text: 'He who believes in him...' },
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

function simulateQuickTap(target: HTMLElement, options?: PointerEventInit) {
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

type UseVerseTapOptions = Parameters<typeof useVerseTap>[0]

function defaultOptions(
  container: HTMLDivElement,
  overrides: Partial<UseVerseTapOptions> = {},
): UseVerseTapOptions {
  return {
    containerRef: { current: container },
    bookSlug: 'john',
    bookName: 'John',
    chapter: 3,
    verses: TEST_VERSES,
    enabled: true,
    verseRange: null,
    onVerseTap: vi.fn(),
    onExtendSelection: vi.fn(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests (BB-38: callback-driven API)
// ---------------------------------------------------------------------------

describe('useVerseTap', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    container = createContainer()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Selection derivation
  // ---------------------------------------------------------------------------

  it('returns null selection when verseRange is null', () => {
    const { result } = renderHook(() => useVerseTap(defaultOptions(container)))
    expect(result.current.selection).toBeNull()
  })

  it('derives a single-verse selection from verseRange prop + verses list', () => {
    const { result } = renderHook(() =>
      useVerseTap(defaultOptions(container, { verseRange: { start: 16, end: 16 } })),
    )
    expect(result.current.selection).not.toBeNull()
    expect(result.current.selection!.startVerse).toBe(16)
    expect(result.current.selection!.endVerse).toBe(16)
    expect(result.current.selection!.bookName).toBe('John')
    expect(result.current.selection!.verses).toHaveLength(1)
  })

  it('derives a multi-verse range selection from verseRange prop', () => {
    const { result } = renderHook(() =>
      useVerseTap(defaultOptions(container, { verseRange: { start: 16, end: 18 } })),
    )
    expect(result.current.selection!.startVerse).toBe(16)
    expect(result.current.selection!.endVerse).toBe(18)
    expect(result.current.selection!.verses).toHaveLength(3)
  })

  it('selection updates when verseRange prop changes between renders', () => {
    const { result, rerender } = renderHook(
      ({ verseRange }: { verseRange: VerseRange | null }) =>
        useVerseTap(defaultOptions(container, { verseRange })),
      { initialProps: { verseRange: null as VerseRange | null } },
    )
    expect(result.current.selection).toBeNull()

    rerender({ verseRange: { start: 17, end: 19 } })
    expect(result.current.selection!.startVerse).toBe(17)
    expect(result.current.selection!.endVerse).toBe(19)
  })

  // ---------------------------------------------------------------------------
  // Tap callbacks (onVerseTap fires when no prior selection)
  // ---------------------------------------------------------------------------

  it('quick tap on verse calls onVerseTap with the verse number (no prior selection)', () => {
    const onVerseTap = vi.fn()
    renderHook(() => useVerseTap(defaultOptions(container, { onVerseTap })))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan)
    })

    expect(onVerseTap).toHaveBeenCalledWith(16)
    expect(onVerseTap).toHaveBeenCalledTimes(1)
  })

  it('tap on non-verse element does not fire either callback', () => {
    const onVerseTap = vi.fn()
    const onExtendSelection = vi.fn()
    const heading = document.createElement('h2')
    heading.textContent = 'Chapter 3'
    container.prepend(heading)

    renderHook(() => useVerseTap(defaultOptions(container, { onVerseTap, onExtendSelection })))

    act(() => {
      simulateQuickTap(heading)
    })

    expect(onVerseTap).not.toHaveBeenCalled()
    expect(onExtendSelection).not.toHaveBeenCalled()
  })

  it('tap with active text selection does not fire callbacks', () => {
    const onVerseTap = vi.fn()
    renderHook(() => useVerseTap(defaultOptions(container, { onVerseTap })))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'selected text',
    } as Selection)

    act(() => {
      simulateQuickTap(verseSpan)
    })

    expect(onVerseTap).not.toHaveBeenCalled()
  })

  it('long press calls onVerseTap', () => {
    const onVerseTap = vi.fn()
    renderHook(() => useVerseTap(defaultOptions(container, { onVerseTap })))
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      verseSpan.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50 }),
      )
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onVerseTap).toHaveBeenCalledWith(16)
  })

  it('long press cancelled by movement does not fire callback', () => {
    const onVerseTap = vi.fn()
    renderHook(() => useVerseTap(defaultOptions(container, { onVerseTap })))
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

    expect(onVerseTap).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Extend callbacks (onExtendSelection fires when verseRange is already set)
  // ---------------------------------------------------------------------------

  it('tap on new verse while selection exists calls onExtendSelection with the expanded range', () => {
    const onExtendSelection = vi.fn()
    renderHook(() =>
      useVerseTap(
        defaultOptions(container, {
          verseRange: { start: 16, end: 16 },
          onExtendSelection,
        }),
      ),
    )
    const verseSpan18 = container.querySelector('[data-verse="18"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan18)
    })

    expect(onExtendSelection).toHaveBeenCalledWith(16, 18)
  })

  it('tap on verse at the start of a multi-verse range shrinks the range', () => {
    const onExtendSelection = vi.fn()
    renderHook(() =>
      useVerseTap(
        defaultOptions(container, {
          verseRange: { start: 16, end: 18 },
          onExtendSelection,
        }),
      ),
    )
    const verseSpan16 = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan16)
    })

    expect(onExtendSelection).toHaveBeenCalledWith(17, 18)
  })

  it('tap on verse at the end of a multi-verse range shrinks the range', () => {
    const onExtendSelection = vi.fn()
    renderHook(() =>
      useVerseTap(
        defaultOptions(container, {
          verseRange: { start: 16, end: 18 },
          onExtendSelection,
        }),
      ),
    )
    const verseSpan18 = container.querySelector('[data-verse="18"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan18)
    })

    expect(onExtendSelection).toHaveBeenCalledWith(16, 17)
  })

  // ---------------------------------------------------------------------------
  // Disabled mode
  // ---------------------------------------------------------------------------

  it('does not fire callbacks when enabled is false', () => {
    const onVerseTap = vi.fn()
    const onExtendSelection = vi.fn()
    renderHook(() =>
      useVerseTap(defaultOptions(container, { enabled: false, onVerseTap, onExtendSelection })),
    )
    const verseSpan = container.querySelector('[data-verse="16"]') as HTMLElement

    act(() => {
      simulateQuickTap(verseSpan)
    })

    expect(onVerseTap).not.toHaveBeenCalled()
    expect(onExtendSelection).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// computeExtendedRange pure helper
// ---------------------------------------------------------------------------

describe('computeExtendedRange', () => {
  it('shrinks from start when tapping the start verse of a multi-verse range', () => {
    expect(computeExtendedRange({ start: 16, end: 18 }, 16)).toEqual({ start: 17, end: 18 })
  })

  it('shrinks from end when tapping the end verse of a multi-verse range', () => {
    expect(computeExtendedRange({ start: 16, end: 18 }, 18)).toEqual({ start: 16, end: 17 })
  })

  it('expands upward when tapping a verse after a single-verse selection', () => {
    expect(computeExtendedRange({ start: 16, end: 16 }, 20)).toEqual({ start: 16, end: 20 })
  })

  it('expands downward when tapping a verse before a single-verse selection', () => {
    expect(computeExtendedRange({ start: 16, end: 16 }, 14)).toEqual({ start: 14, end: 16 })
  })

  it('expands outward when tapping a verse outside a multi-verse range', () => {
    expect(computeExtendedRange({ start: 16, end: 18 }, 20)).toEqual({ start: 16, end: 20 })
  })

  it('is a no-op when tapping the sole selected verse', () => {
    // Tapping verse 16 when selection is { 16, 16 } — not an edge shrink (range === 1),
    // so it falls through to the expand branch, which produces the same range.
    expect(computeExtendedRange({ start: 16, end: 16 }, 16)).toEqual({ start: 16, end: 16 })
  })
})
