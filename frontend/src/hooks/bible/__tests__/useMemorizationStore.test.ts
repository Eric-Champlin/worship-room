import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMemorizationStore } from '../useMemorizationStore'
import { addCard, removeCard, _resetForTesting } from '@/lib/memorize'

const baseParams = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verseText: 'For God so loved the world...',
  reference: 'John 3:16',
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('useMemorizationStore', () => {
  it('returns empty array initially', () => {
    const { result } = renderHook(() => useMemorizationStore())
    expect(result.current).toEqual([])
  })

  it('re-renders when card is added', () => {
    const { result } = renderHook(() => useMemorizationStore())

    act(() => {
      addCard(baseParams)
    })

    expect(result.current).toHaveLength(1)
    expect(result.current[0].book).toBe('john')
  })

  it('re-renders when card is removed', () => {
    const card = addCard(baseParams)
    const { result } = renderHook(() => useMemorizationStore())

    expect(result.current).toHaveLength(1)

    act(() => {
      removeCard(card.id)
    })

    expect(result.current).toHaveLength(0)
  })
})
