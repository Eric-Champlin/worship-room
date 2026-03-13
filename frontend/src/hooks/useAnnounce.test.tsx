import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAnnounce } from './useAnnounce'

import { render, screen } from '@testing-library/react'
import { useRef } from 'react'

function TestComponent({ onAnnounce }: { onAnnounce?: (announce: (msg: string, p?: 'polite' | 'assertive') => void) => void }) {
  const { announce, AnnouncerRegion } = useAnnounce()
  const calledRef = useRef(false)

  if (!calledRef.current && onAnnounce) {
    calledRef.current = true
    // Expose announce to test via callback
    onAnnounce(announce)
  }

  return <AnnouncerRegion />
}

describe('useAnnounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders sr-only live regions', () => {
    render(<TestComponent />)

    const polite = screen.getByTestId('announce-polite')
    const assertive = screen.getByTestId('announce-assertive')

    expect(polite).toHaveAttribute('aria-live', 'polite')
    expect(polite).toHaveAttribute('aria-atomic', 'true')
    expect(polite).toHaveClass('sr-only')

    expect(assertive).toHaveAttribute('aria-live', 'assertive')
    expect(assertive).toHaveAttribute('aria-atomic', 'true')
    expect(assertive).toHaveClass('sr-only')
  })

  it('announce updates polite region after debounce', () => {
    let announceFn: (msg: string, p?: 'polite' | 'assertive') => void = () => {}
    render(<TestComponent onAnnounce={(fn) => { announceFn = fn }} />)

    act(() => {
      announceFn('hello')
    })

    // Before debounce fires, content should be empty
    expect(screen.getByTestId('announce-polite').textContent).toBe('')

    // After 300ms debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByTestId('announce-polite').textContent).toBe('hello')
  })

  it('announce with assertive updates assertive region immediately', () => {
    let announceFn: (msg: string, p?: 'polite' | 'assertive') => void = () => {}
    render(<TestComponent onAnnounce={(fn) => { announceFn = fn }} />)

    act(() => {
      announceFn('urgent', 'assertive')
    })

    // Assertive is immediate — no debounce
    expect(screen.getByTestId('announce-assertive').textContent).toBe('urgent')
  })

  it('debounces rapid polite announcements', () => {
    let announceFn: (msg: string, p?: 'polite' | 'assertive') => void = () => {}
    render(<TestComponent onAnnounce={(fn) => { announceFn = fn }} />)

    act(() => {
      announceFn('first')
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    act(() => {
      announceFn('second')
    })

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Only 'second' should be announced (first was debounced away)
    expect(screen.getByTestId('announce-polite').textContent).toBe('second')
  })

  it('assertive announcements are not debounced', () => {
    let announceFn: (msg: string, p?: 'polite' | 'assertive') => void = () => {}
    render(<TestComponent onAnnounce={(fn) => { announceFn = fn }} />)

    act(() => {
      announceFn('first', 'assertive')
    })

    expect(screen.getByTestId('announce-assertive').textContent).toBe('first')

    act(() => {
      announceFn('second', 'assertive')
    })

    expect(screen.getByTestId('announce-assertive').textContent).toBe('second')
  })

  it('clears text after 5 seconds', () => {
    let announceFn: (msg: string, p?: 'polite' | 'assertive') => void = () => {}
    render(<TestComponent onAnnounce={(fn) => { announceFn = fn }} />)

    act(() => {
      announceFn('will clear')
    })

    act(() => {
      vi.advanceTimersByTime(300) // debounce
    })

    expect(screen.getByTestId('announce-polite').textContent).toBe('will clear')

    act(() => {
      vi.advanceTimersByTime(5000) // clear timeout
    })

    expect(screen.getByTestId('announce-polite').textContent).toBe('')
  })
})
