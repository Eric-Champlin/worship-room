import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getActionByType } from '../verseActionRegistry'
import { _resetForTesting, getAllCards } from '@/lib/memorize'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

const makeSelection = (
  overrides?: Partial<VerseSelection>,
): VerseSelection => ({
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world...' }],
  ...overrides,
})

const makeContext = (): VerseActionContext => ({
  showToast: vi.fn(),
  closeSheet: vi.fn(),
  openSubView: vi.fn(),
})

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('memorize action', () => {
  const action = getActionByType('memorize')!

  it('exists in registry', () => {
    expect(action).toBeDefined()
    expect(action.action).toBe('memorize')
  })

  it('hasSubView is false', () => {
    expect(action.hasSubView).toBe(false)
  })

  it('adds card for new verse', () => {
    const ctx = makeContext()
    action.onInvoke(makeSelection(), ctx)
    expect(getAllCards()).toHaveLength(1)
    expect(getAllCards()[0].reference).toBe('John 3:16')
  })

  it('removes card for existing verse', () => {
    const sel = makeSelection()
    const ctx = makeContext()
    action.onInvoke(sel, ctx) // add
    expect(getAllCards()).toHaveLength(1)
    action.onInvoke(sel, ctx) // remove
    expect(getAllCards()).toHaveLength(0)
  })

  it('getState returns active when verse in deck', () => {
    const sel = makeSelection()
    action.onInvoke(sel, makeContext())
    expect(action.getState?.(sel)).toEqual({ active: true })
  })

  it('getState returns inactive when verse not in deck', () => {
    expect(action.getState?.(makeSelection())).toEqual({ active: false })
  })

  it('shows toast on add', () => {
    const ctx = makeContext()
    action.onInvoke(makeSelection(), ctx)
    expect(ctx.showToast).toHaveBeenCalledWith('Added to memorization deck')
  })

  it('shows toast on remove', () => {
    const ctx = makeContext()
    const sel = makeSelection()
    action.onInvoke(sel, ctx) // add
    action.onInvoke(sel, ctx) // remove
    expect(ctx.showToast).toHaveBeenCalledWith('Removed from memorization deck')
  })

  it('captures verse text from multi-verse selection', () => {
    const sel = makeSelection({
      startVerse: 1,
      endVerse: 3,
      verses: [
        { number: 1, text: 'Verse one.' },
        { number: 2, text: 'Verse two.' },
        { number: 3, text: 'Verse three.' },
      ],
    })
    action.onInvoke(sel, makeContext())
    expect(getAllCards()[0].verseText).toBe('Verse one. Verse two. Verse three.')
  })

  it('formats reference correctly for single verse', () => {
    action.onInvoke(makeSelection(), makeContext())
    expect(getAllCards()[0].reference).toBe('John 3:16')
  })

  it('formats reference correctly for range', () => {
    const sel = makeSelection({
      startVerse: 1,
      endVerse: 3,
      verses: [
        { number: 1, text: 'One.' },
        { number: 2, text: 'Two.' },
        { number: 3, text: 'Three.' },
      ],
    })
    action.onInvoke(sel, makeContext())
    expect(getAllCards()[0].reference).toBe('John 3:1\u20133')
  })
})
