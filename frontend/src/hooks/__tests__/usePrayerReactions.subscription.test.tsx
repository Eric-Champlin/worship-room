import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import {
  togglePraying,
  toggleBookmark,
  _resetForTesting,
} from '@/lib/prayer-wall/reactionsStore'

function HookConsumer({ prayerId }: { prayerId: string }) {
  const { reactions } = usePrayerReactions()
  const reaction = reactions[prayerId]
  return (
    <div>
      <span data-testid="praying">{String(reaction?.isPraying ?? false)}</span>
      <span data-testid="bookmarked">{String(reaction?.isBookmarked ?? false)}</span>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('usePrayerReactions subscription', () => {
  it('re-renders when togglePraying is called externally after mount', () => {
    render(<HookConsumer prayerId="test-prayer-1" />)
    expect(screen.getByTestId('praying').textContent).toBe('false')

    act(() => {
      togglePraying('test-prayer-1')
    })

    expect(screen.getByTestId('praying').textContent).toBe('true')
  })

  it('re-renders when toggleBookmark is called externally after mount', () => {
    render(<HookConsumer prayerId="test-prayer-1" />)
    expect(screen.getByTestId('bookmarked').textContent).toBe('false')

    act(() => {
      toggleBookmark('test-prayer-1')
    })

    expect(screen.getByTestId('bookmarked').textContent).toBe('true')
  })

  it('two independent HookConsumer instances stay in sync when the store mutates', () => {
    render(
      <>
        <HookConsumer prayerId="test-prayer-2" />
        <HookConsumer prayerId="test-prayer-2" />
      </>,
    )

    act(() => {
      togglePraying('test-prayer-2')
    })

    const prayingSpans = screen.getAllByTestId('praying')
    expect(prayingSpans).toHaveLength(2)
    expect(prayingSpans[0].textContent).toBe('true')
    expect(prayingSpans[1].textContent).toBe('true')
  })
})
