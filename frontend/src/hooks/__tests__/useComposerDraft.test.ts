import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useComposerDraft,
  COMPOSER_DRAFT_TICK_MS,
} from '@/hooks/useComposerDraft'
import {
  getDraft,
  setDraft,
  COMPOSER_DRAFTS_KEY,
  DRAFT_EXPIRY_MS,
} from '@/services/composer-drafts-storage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useComposerDraft — auto-save behavior', () => {
  it('T1: auto-saves dirty content after 5 seconds while open', () => {
    vi.useFakeTimers()
    const { rerender } = renderHook(
      ({ content }) =>
        useComposerDraft({ draftKey: 'prayer_request', content, isOpen: true }),
      { initialProps: { content: '' } },
    )
    // User types content.
    rerender({ content: 'help me pray' })
    expect(getDraft('prayer_request')).toBeNull() // not yet — interval hasn't ticked
    act(() => {
      vi.advanceTimersByTime(COMPOSER_DRAFT_TICK_MS)
    })
    expect(getDraft('prayer_request')!.content).toBe('help me pray')
  })

  it('T2: does NOT re-save the same content twice in a row', () => {
    vi.useFakeTimers()
    const { rerender } = renderHook(
      ({ content }) =>
        useComposerDraft({ draftKey: 'prayer_request', content, isOpen: true }),
      { initialProps: { content: '' } },
    )
    // Type new content — marks dirty.
    rerender({ content: 'first save' })
    act(() => {
      vi.advanceTimersByTime(COMPOSER_DRAFT_TICK_MS)
    })
    const firstUpdate = getDraft('prayer_request')!.updatedAt
    // Re-render with the SAME content — should NOT mark dirty, no save.
    rerender({ content: 'first save' })
    act(() => {
      vi.advanceTimersByTime(COMPOSER_DRAFT_TICK_MS)
    })
    expect(getDraft('prayer_request')!.updatedAt).toBe(firstUpdate)
  })

  it('does NOT save empty/whitespace content', () => {
    vi.useFakeTimers()
    const { rerender } = renderHook(
      ({ content }) =>
        useComposerDraft({ draftKey: 'prayer_request', content, isOpen: true }),
      { initialProps: { content: 'a' } },
    )
    rerender({ content: '   ' })
    act(() => {
      vi.advanceTimersByTime(COMPOSER_DRAFT_TICK_MS)
    })
    // Whitespace-only content is not persisted.
    expect(getDraft('prayer_request')).toBeNull()
  })

  it('does NOT save when isOpen is false', () => {
    vi.useFakeTimers()
    const { rerender } = renderHook(
      ({ content, isOpen }) =>
        useComposerDraft({
          draftKey: 'prayer_request',
          content,
          isOpen,
        }),
      { initialProps: { content: 'something', isOpen: false } },
    )
    rerender({ content: 'changed', isOpen: false })
    act(() => {
      vi.advanceTimersByTime(COMPOSER_DRAFT_TICK_MS * 2)
    })
    expect(getDraft('prayer_request')).toBeNull()
  })
})

describe('useComposerDraft — restore prompt', () => {
  it('T8: returns null draftToRestore for an expired record', () => {
    // Inject an expired record directly.
    localStorage.setItem(
      COMPOSER_DRAFTS_KEY,
      JSON.stringify({
        prayer_request: {
          content: 'ancient text',
          updatedAt: Date.now() - DRAFT_EXPIRY_MS - 1000,
        },
      }),
    )
    const { result } = renderHook(() =>
      useComposerDraft({
        draftKey: 'prayer_request',
        content: '',
        isOpen: true,
      }),
    )
    expect(result.current.draftToRestore).toBeNull()
  })

  it('surfaces a fresh draft on open', () => {
    setDraft('prayer_request', 'remembered prayer')
    const { result } = renderHook(() =>
      useComposerDraft({
        draftKey: 'prayer_request',
        content: '',
        isOpen: true,
      }),
    )
    expect(result.current.draftToRestore?.content).toBe('remembered prayer')
  })

  it('restoreDraft returns the saved content and dismisses the prompt', () => {
    setDraft('prayer_request', 'remembered prayer')
    const { result } = renderHook(() =>
      useComposerDraft({
        draftKey: 'prayer_request',
        content: '',
        isOpen: true,
      }),
    )
    let restored: string = ''
    act(() => {
      restored = result.current.restoreDraft()
    })
    expect(restored).toBe('remembered prayer')
    expect(result.current.draftToRestore).toBeNull()
  })

  it('discardDraft removes the draft from storage and dismisses', () => {
    setDraft('prayer_request', 'never mind')
    const { result } = renderHook(() =>
      useComposerDraft({
        draftKey: 'prayer_request',
        content: '',
        isOpen: true,
      }),
    )
    act(() => {
      result.current.discardDraft()
    })
    expect(getDraft('prayer_request')).toBeNull()
    expect(result.current.draftToRestore).toBeNull()
  })

  it('T11: postType change mid-lifecycle re-reads the new draft', () => {
    setDraft('prayer_request', 'pray draft')
    setDraft('testimony', 'testimony draft')
    const { result, rerender } = renderHook(
      ({ draftKey }) =>
        useComposerDraft({
          draftKey,
          content: '',
          isOpen: true,
        }),
      {
        initialProps: { draftKey: 'prayer_request' as const },
      },
    )
    expect(result.current.draftToRestore?.content).toBe('pray draft')
    rerender({ draftKey: 'testimony' as const })
    expect(result.current.draftToRestore?.content).toBe('testimony draft')
  })
})

describe('useComposerDraft — clearDraft', () => {
  it('removes the draft on successful submit (used by composer)', () => {
    setDraft('prayer_request', 'will be cleared')
    const { result } = renderHook(() =>
      useComposerDraft({
        draftKey: 'prayer_request',
        content: 'will be cleared',
        isOpen: true,
      }),
    )
    act(() => {
      result.current.clearDraft()
    })
    expect(getDraft('prayer_request')).toBeNull()
  })
})
