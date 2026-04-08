import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getAllActions,
  getPrimaryActions,
  getSecondaryActions,
  getActionByType,
  formatReference,
  getSelectionText,
  getSelectionTextWithRef,
  copyToClipboard,
} from '../verseActionRegistry'
import { applyHighlight } from '../highlightStore'
import { toggleBookmark, getAllBookmarks, _resetCacheForTesting as resetBookmarkCache } from '../bookmarkStore'
import { upsertNote, _resetCacheForTesting as resetNoteCache } from '../notes/store'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const SINGLE_VERSE: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [
    {
      number: 16,
      text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    },
  ],
}

const MULTI_VERSE: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 18,
  verses: [
    {
      number: 16,
      text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    },
    {
      number: 17,
      text: "For God didn't send his Son into the world to judge the world, but that the world should be saved through him.",
    },
    {
      number: 18,
      text: "He who believes in him is not judged. He who doesn't believe has been judged already, because he has not believed in the name of the only born Son of God.",
    },
  ],
}

function createMockContext(): VerseActionContext {
  return {
    showToast: vi.fn(),
    closeSheet: vi.fn(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('verseActionRegistry', () => {
  describe('registry structure', () => {
    it('exports all 12 actions (4 primary + 8 secondary)', () => {
      const all = getAllActions()
      expect(all).toHaveLength(12)
      expect(getPrimaryActions()).toHaveLength(4)
      expect(getSecondaryActions()).toHaveLength(8)
    })

    it('getActionByType returns correct handler', () => {
      const copy = getActionByType('copy')
      expect(copy).toBeDefined()
      expect(copy!.label).toBe('Copy')
    })

    it('getActionByType returns undefined for unknown action', () => {
      const result = getActionByType('nonexistent' as never)
      expect(result).toBeUndefined()
    })
  })

  describe('formatReference', () => {
    it('formats single verse', () => {
      expect(formatReference(SINGLE_VERSE)).toBe('John 3:16')
    })

    it('formats range with en-dash', () => {
      expect(formatReference(MULTI_VERSE)).toBe('John 3:16\u201318')
    })
  })

  describe('getSelectionText', () => {
    it('returns text for single verse', () => {
      const text = getSelectionText(SINGLE_VERSE)
      expect(text).toBe(SINGLE_VERSE.verses[0].text)
    })

    it('returns joined text for multiple verses', () => {
      const text = getSelectionText(MULTI_VERSE)
      expect(text).toContain(MULTI_VERSE.verses[0].text)
      expect(text).toContain(MULTI_VERSE.verses[1].text)
      expect(text).toContain(MULTI_VERSE.verses[2].text)
    })
  })

  describe('getSelectionTextWithRef', () => {
    it('returns text with reference in correct format', () => {
      const result = getSelectionTextWithRef(SINGLE_VERSE)
      expect(result).toContain('\u201C') // opening smart quote
      expect(result).toContain('\u201D') // closing smart quote
      expect(result).toContain('\u2014 John 3:16 (WEB)') // em-dash + ref
    })
  })

  describe('copy handler', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('invokes clipboard with correct text', () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const handler = getActionByType('copy')!
      const ctx = createMockContext()
      handler.onInvoke(SINGLE_VERSE, ctx)

      expect(writeText).toHaveBeenCalledWith(SINGLE_VERSE.verses[0].text)
    })

    it('shows toast', () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const handler = getActionByType('copy')!
      const ctx = createMockContext()
      handler.onInvoke(SINGLE_VERSE, ctx)

      expect(ctx.showToast).toHaveBeenCalledWith('Copied')
    })

    it('closes sheet after 400ms delay', () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const handler = getActionByType('copy')!
      const ctx = createMockContext()
      handler.onInvoke(SINGLE_VERSE, ctx)

      expect(ctx.closeSheet).not.toHaveBeenCalled()
      vi.advanceTimersByTime(400)
      expect(ctx.closeSheet).toHaveBeenCalledOnce()
    })
  })

  describe('copy-with-ref handler', () => {
    it('invokes clipboard with reference format', () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const handler = getActionByType('copy-with-ref')!
      const ctx = createMockContext()
      handler.onInvoke(SINGLE_VERSE, ctx)

      const arg = writeText.mock.calls[0][0] as string
      expect(arg).toContain('\u2014 John 3:16 (WEB)')
    })

    it('shows correct toast message', () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const handler = getActionByType('copy-with-ref')!
      const ctx = createMockContext()
      handler.onInvoke(SINGLE_VERSE, ctx)

      expect(ctx.showToast).toHaveBeenCalledWith('Copied with reference')
    })
  })

  describe('stub handlers', () => {
    it('all stubs fire without error', () => {
      const all = getAllActions()
      const ctx = createMockContext()

      for (const handler of all) {
        expect(() => handler.onInvoke(SINGLE_VERSE, ctx)).not.toThrow()
      }
    })

    it('sub-view stubs render placeholder containing "ships in BB-"', () => {
      // Exclude highlight (BB-7), note (BB-8), cross-refs (BB-9) — only stubs match this pattern
      const withSubViews = getAllActions().filter(
        (h) =>
          h.hasSubView &&
          h.renderSubView &&
          h.action !== 'highlight' &&
          h.action !== 'note' &&
          h.action !== 'cross-refs',
      )
      expect(withSubViews.length).toBeGreaterThan(0)

      for (const handler of withSubViews) {
        const element = handler.renderSubView!({
          selection: SINGLE_VERSE,
          onBack: () => {},
        })
        expect(element).toBeDefined()
        const el = element as { props: { children: string } }
        expect(el.props.children).toMatch(/ships? in BB-\d/)
      }
    })
  })

  describe('highlight handler', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('has hasSubView: true', () => {
      const handler = getActionByType('highlight')!
      expect(handler.hasSubView).toBe(true)
    })

    it('getState returns active for highlighted verse', () => {
      applyHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'peace')

      const handler = getActionByType('highlight')!
      const state = handler.getState!(SINGLE_VERSE)
      expect(state.active).toBe(true)
      expect(state.activeColor).toBe('var(--highlight-peace)')
    })

    it('getState returns inactive for unhighlighted verse', () => {
      const handler = getActionByType('highlight')!
      // Use a verse in a different chapter that has no highlights
      const unhighlightedSel: VerseSelection = {
        book: 'genesis',
        bookName: 'Genesis',
        chapter: 1,
        startVerse: 1,
        endVerse: 1,
        verses: [{ number: 1, text: 'In the beginning...' }],
      }
      const state = handler.getState!(unhighlightedSel)
      expect(state.active).toBe(false)
    })

    it('renderSubView returns a React element', () => {
      const handler = getActionByType('highlight')!
      const element = handler.renderSubView!({
        selection: SINGLE_VERSE,
        onBack: () => {},
      })
      expect(element).toBeDefined()
    })
  })

  describe('bookmark handler', () => {
    beforeEach(() => {
      localStorage.clear()
      resetBookmarkCache()
    })

    it('returns active state when bookmarked', () => {
      toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const handler = getActionByType('bookmark')!
      const state = handler.getState!(SINGLE_VERSE)
      expect(state.active).toBe(true)
    })

    it('returns inactive state when not bookmarked', () => {
      const handler = getActionByType('bookmark')!
      const state = handler.getState!(SINGLE_VERSE)
      expect(state.active).toBe(false)
    })

    it('shows "Bookmarked" toast with undo on create', () => {
      const handler = getActionByType('bookmark')!
      const ctx = createMockContext()

      handler.onInvoke(SINGLE_VERSE, ctx)

      expect(ctx.showToast).toHaveBeenCalledWith('Bookmarked', undefined, expect.objectContaining({
        label: 'Undo',
        onClick: expect.any(Function),
      }))
    })

    it('shows "Bookmark removed" toast with undo on remove', () => {
      toggleBookmark({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })

      const handler = getActionByType('bookmark')!
      const ctx = createMockContext()

      handler.onInvoke(SINGLE_VERSE, ctx)

      expect(ctx.showToast).toHaveBeenCalledWith('Bookmark removed', undefined, expect.objectContaining({
        label: 'Undo',
        onClick: expect.any(Function),
      }))
    })

    it('does not close sheet', () => {
      const handler = getActionByType('bookmark')!
      const ctx = createMockContext()

      handler.onInvoke(SINGLE_VERSE, ctx)

      expect(ctx.closeSheet).not.toHaveBeenCalled()
    })

    it('rapid toggle undo guard prevents stale undo', () => {
      const handler = getActionByType('bookmark')!

      // First toggle: creates bookmark
      const ctx1 = createMockContext()
      handler.onInvoke(SINGLE_VERSE, ctx1)
      const firstUndoAction = (ctx1.showToast as ReturnType<typeof vi.fn>).mock.calls[0][2] as { onClick: () => void }

      // Second toggle: removes bookmark
      const ctx2 = createMockContext()
      handler.onInvoke(SINGLE_VERSE, ctx2)

      // Try undo from first toggle — should be stale (no-op)
      firstUndoAction.onClick()

      // Bookmark was removed by toggle 2, stale undo should NOT have restored it
      expect(getAllBookmarks()).toHaveLength(0)
    })

    it('catches BookmarkStorageFullError', () => {
      const handler = getActionByType('bookmark')!
      const ctx = createMockContext()

      const original = Storage.prototype.setItem
      const quotaError = new Error('quota exceeded')
      quotaError.name = 'QuotaExceededError'
      Storage.prototype.setItem = function (key: string) {
        if (key === 'bible:bookmarks') {
          throw quotaError
        }
        return original.apply(this, arguments as unknown as [string, string])
      }

      try {
        handler.onInvoke(SINGLE_VERSE, ctx)
        expect(ctx.showToast).toHaveBeenCalledWith('Storage full — export your bookmarks and clear old ones.')
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })

  describe('note handler', () => {
    beforeEach(() => {
      localStorage.clear()
      resetNoteCache()
    })

    it('getState returns { active: false } when no note exists', () => {
      const handler = getActionByType('note')!
      const state = handler.getState!(SINGLE_VERSE)
      expect(state.active).toBe(false)
    })

    it('getState returns { active: true, activeColor } when note exists for selection', () => {
      upsertNote({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }, 'Test note')

      const handler = getActionByType('note')!
      const state = handler.getState!(SINGLE_VERSE)
      expect(state.active).toBe(true)
      expect(state.activeColor).toBe('var(--note-marker)')
    })

    it('getState returns active for multi-verse selection where one verse has a note', () => {
      upsertNote({ book: 'john', chapter: 3, startVerse: 17, endVerse: 17 }, 'Note on v17')

      const handler = getActionByType('note')!
      const state = handler.getState!(MULTI_VERSE)
      expect(state.active).toBe(true)
    })

    it('renderSubView returns a valid React element', () => {
      const handler = getActionByType('note')!
      const element = handler.renderSubView!({
        selection: SINGLE_VERSE,
        onBack: () => {},
      })
      expect(element).toBeDefined()
    })
  })

  describe('cross-refs handler (BB-9)', () => {
    it('has hasSubView true', () => {
      const handler = getActionByType('cross-refs')!
      expect(handler.hasSubView).toBe(true)
    })

    it('has renderBadge defined', () => {
      const handler = getActionByType('cross-refs')!
      expect(handler.renderBadge).toBeDefined()
    })

    it('renderSubView returns a valid React element', () => {
      const handler = getActionByType('cross-refs')!
      const element = handler.renderSubView!({
        selection: SINGLE_VERSE,
        onBack: () => {},
      })
      expect(element).toBeDefined()
    })
  })

  describe('copyToClipboard', () => {
    it('uses navigator.clipboard when available', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      const result = await copyToClipboard('test')
      expect(result).toBe(true)
      expect(writeText).toHaveBeenCalledWith('test')
    })

    it('falls back to execCommand when clipboard API fails', async () => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) } })
      const execCommand = vi.fn().mockReturnValue(true)
      document.execCommand = execCommand

      const result = await copyToClipboard('test')
      expect(result).toBe(true)
      expect(execCommand).toHaveBeenCalledWith('copy')
    })
  })
})
