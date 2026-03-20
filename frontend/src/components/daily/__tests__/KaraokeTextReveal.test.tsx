import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

import { useReducedMotion } from '@/hooks/useReducedMotion'

import { KaraokeTextReveal } from '../KaraokeTextReveal'

vi.mock('@/hooks/useReducedMotion')

const TEST_TEXT = 'The Lord is near to the brokenhearted'
const TEST_WORDS = TEST_TEXT.split(/\s+/)
const TEST_WORD_COUNT = TEST_WORDS.length

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KaraokeTextReveal', () => {
  it('renders all words from text', () => {
    render(<KaraokeTextReveal text={TEST_TEXT} />)
    for (const word of TEST_WORDS) {
      expect(screen.getByText(word)).toBeInTheDocument()
    }
  })

  it('words start with opacity 0', () => {
    render(<KaraokeTextReveal text={TEST_TEXT} />)
    for (const word of TEST_WORDS) {
      const el = screen.getByText(word)
      expect(el.style.opacity).toBe('0')
      expect(el.style.transform).toBe('translateY(4px)')
    }
  })

  it('words reveal sequentially', () => {
    const revealDuration = 2500
    const perWordDelay = revealDuration / TEST_WORD_COUNT

    render(<KaraokeTextReveal text={TEST_TEXT} revealDuration={revealDuration} />)

    // After one word delay, first word should be revealed
    act(() => {
      vi.advanceTimersByTime(perWordDelay + 1)
    })
    expect(screen.getByText(TEST_WORDS[0]).style.opacity).toBe('1')
    expect(screen.getByText(TEST_WORDS[0]).style.transform).toBe('translateY(0)')
    // Second word still hidden
    expect(screen.getByText(TEST_WORDS[1]).style.opacity).toBe('0')

    // After second word delay
    act(() => {
      vi.advanceTimersByTime(perWordDelay)
    })
    expect(screen.getByText(TEST_WORDS[1]).style.opacity).toBe('1')
  })

  it('fires onRevealComplete after last word', () => {
    const onComplete = vi.fn()
    const revealDuration = 2500
    const perWordDelay = revealDuration / TEST_WORD_COUNT

    render(
      <KaraokeTextReveal
        text={TEST_TEXT}
        revealDuration={revealDuration}
        onRevealComplete={onComplete}
      />,
    )

    // Advance past all words + 200ms completion buffer
    act(() => {
      vi.advanceTimersByTime(perWordDelay * TEST_WORD_COUNT + 201)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('cleans up timeouts on unmount', () => {
    const onComplete = vi.fn()

    const { unmount } = render(
      <KaraokeTextReveal
        text={TEST_TEXT}
        revealDuration={2500}
        onRevealComplete={onComplete}
      />,
    )

    // Unmount before reveal completes
    act(() => {
      vi.advanceTimersByTime(500)
    })
    unmount()

    // Advance past full duration — onComplete should not fire
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('respects prefers-reduced-motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const onComplete = vi.fn()

    render(
      <KaraokeTextReveal
        text={TEST_TEXT}
        revealDuration={2500}
        onRevealComplete={onComplete}
      />,
    )

    // All words should be visible immediately
    for (const word of TEST_WORDS) {
      expect(screen.getByText(word).style.opacity).toBe('1')
    }

    // onRevealComplete fires on next tick
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('empty text renders nothing', () => {
    const { container } = render(<KaraokeTextReveal text="" />)
    expect(container.innerHTML).toBe('')
  })

  it('re-render with same text does not restart', () => {
    const onComplete = vi.fn()
    const revealDuration = 2500
    const perWordDelay = revealDuration / TEST_WORD_COUNT

    const { rerender } = render(
      <KaraokeTextReveal
        text={TEST_TEXT}
        revealDuration={revealDuration}
        onRevealComplete={onComplete}
      />,
    )

    // Advance to reveal all words
    act(() => {
      vi.advanceTimersByTime(perWordDelay * TEST_WORD_COUNT + 201)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)

    // Re-render with same text
    rerender(
      <KaraokeTextReveal
        text={TEST_TEXT}
        revealDuration={revealDuration}
        onRevealComplete={onComplete}
      />,
    )

    // All words should remain revealed, no restart
    for (const word of TEST_WORDS) {
      expect(screen.getByText(word).style.opacity).toBe('1')
    }

    // onRevealComplete should not fire again
    act(() => {
      vi.advanceTimersByTime(revealDuration + 201)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('re-render with different text restarts reveal', () => {
    const newText = 'Be still and know'
    const newWords = newText.split(/\s+/)

    const { rerender } = render(
      <KaraokeTextReveal text={TEST_TEXT} revealDuration={2500} />,
    )

    // Advance to reveal some words
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Re-render with different text
    rerender(<KaraokeTextReveal text={newText} revealDuration={2500} />)

    // New words should start hidden
    for (const word of newWords) {
      expect(screen.getByText(word).style.opacity).toBe('0')
    }
  })

  it('applies custom className to container', () => {
    const { container } = render(
      <KaraokeTextReveal text={TEST_TEXT} className="custom-class" />,
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('calculates per-word delay from revealDuration', () => {
    const revealDuration = 2500
    const perWordDelay = revealDuration / TEST_WORD_COUNT
    const onComplete = vi.fn()

    render(
      <KaraokeTextReveal
        text={TEST_TEXT}
        revealDuration={revealDuration}
        onRevealComplete={onComplete}
      />,
    )

    // After exactly one word's delay, first word should be revealed
    act(() => {
      vi.advanceTimersByTime(perWordDelay + 1)
    })
    expect(screen.getByText(TEST_WORDS[0]).style.opacity).toBe('1')

    // But second word not yet
    expect(screen.getByText(TEST_WORDS[1]).style.opacity).toBe('0')
  })

  it('uses msPerWord when provided', () => {
    const msPerWord = 300
    const onComplete = vi.fn()

    render(
      <KaraokeTextReveal
        text={TEST_TEXT}
        msPerWord={msPerWord}
        onRevealComplete={onComplete}
      />,
    )

    // After 300ms, first word revealed
    act(() => {
      vi.advanceTimersByTime(301)
    })
    expect(screen.getByText(TEST_WORDS[0]).style.opacity).toBe('1')

    // After 600ms, second word revealed
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByText(TEST_WORDS[1]).style.opacity).toBe('1')

    // Complete fires after all words + 200ms buffer
    act(() => {
      vi.advanceTimersByTime(msPerWord * (TEST_WORD_COUNT - 2) + 201)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('no font styles applied to spans', () => {
    render(<KaraokeTextReveal text={TEST_TEXT} />)
    for (const word of TEST_WORDS) {
      const el = screen.getByText(word)
      expect(el.style.fontFamily).toBe('')
      expect(el.style.fontSize).toBe('')
      expect(el.style.fontWeight).toBe('')
      expect(el.style.color).toBe('')
    }
  })
})
