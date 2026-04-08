import { describe, it, expect, beforeEach } from 'vitest'
import { readStack, writeStack, clearStack } from '../drawerStack'

const STACK_KEY = 'wr_bible_drawer_stack'

beforeEach(() => {
  localStorage.clear()
})

describe('drawerStack', () => {
  it('readStack returns null when nothing stored', () => {
    expect(readStack()).toBeNull()
  })

  it('readStack returns stack when within TTL', () => {
    localStorage.setItem(
      STACK_KEY,
      JSON.stringify({
        stack: [{ type: 'books' }, { type: 'chapters', bookSlug: 'john' }],
        timestamp: Date.now() - 1000, // 1 second ago
      }),
    )
    const stack = readStack()
    expect(stack).toHaveLength(2)
    expect(stack![1]).toEqual({ type: 'chapters', bookSlug: 'john' })
  })

  it('readStack returns null when expired (>24h)', () => {
    localStorage.setItem(
      STACK_KEY,
      JSON.stringify({
        stack: [{ type: 'books' }],
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      }),
    )
    expect(readStack()).toBeNull()
    // Should also clean up the stale entry
    expect(localStorage.getItem(STACK_KEY)).toBeNull()
  })

  it('writeStack persists with timestamp', () => {
    const stack = [{ type: 'books' as const }, { type: 'chapters' as const, bookSlug: 'genesis' }]
    writeStack(stack)

    const stored = JSON.parse(localStorage.getItem(STACK_KEY)!)
    expect(stored.stack).toEqual(stack)
    expect(stored.timestamp).toBeGreaterThan(0)
    expect(Date.now() - stored.timestamp).toBeLessThan(1000)
  })

  it('clearStack removes the key', () => {
    writeStack([{ type: 'books' }])
    expect(localStorage.getItem(STACK_KEY)).not.toBeNull()

    clearStack()
    expect(localStorage.getItem(STACK_KEY)).toBeNull()
  })

  it('readStack handles invalid JSON gracefully', () => {
    localStorage.setItem(STACK_KEY, '{not-valid-json')
    expect(readStack()).toBeNull()
  })
})
