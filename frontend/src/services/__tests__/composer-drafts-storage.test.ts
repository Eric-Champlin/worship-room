import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getDraft,
  setDraft,
  removeDraft,
  clearAllComposerDrafts,
  isDraftExpired,
  COMPOSER_DRAFTS_KEY,
  DRAFT_EXPIRY_MS,
} from '../composer-drafts-storage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getDraft', () => {
  it('returns null when key absent', () => {
    expect(getDraft('prayer_request')).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    localStorage.setItem(COMPOSER_DRAFTS_KEY, '{not-valid-json')
    expect(getDraft('prayer_request')).toBeNull()
  })

  it('returns null when storage is a non-object string', () => {
    localStorage.setItem(COMPOSER_DRAFTS_KEY, JSON.stringify('hello'))
    expect(getDraft('prayer_request')).toBeNull()
  })
})

describe('setDraft + getDraft round-trip', () => {
  it('persists content and a recent updatedAt', () => {
    const before = Date.now()
    setDraft('prayer_request', 'Please pray for my family')
    const after = Date.now()
    const record = getDraft('prayer_request')
    expect(record).not.toBeNull()
    expect(record!.content).toBe('Please pray for my family')
    expect(record!.updatedAt).toBeGreaterThanOrEqual(before)
    expect(record!.updatedAt).toBeLessThanOrEqual(after)
  })

  it('overwrites the same key on a second write', () => {
    setDraft('prayer_request', 'first')
    setDraft('prayer_request', 'second')
    expect(getDraft('prayer_request')!.content).toBe('second')
  })

  it('keeps two different DraftKeys independent (T4 storage side)', () => {
    setDraft('prayer_request', 'a prayer')
    setDraft('qotd', 'a qotd response')
    expect(getDraft('prayer_request')!.content).toBe('a prayer')
    expect(getDraft('qotd')!.content).toBe('a qotd response')
  })
})

describe('removeDraft', () => {
  it('deletes a single key without touching siblings', () => {
    setDraft('prayer_request', 'a')
    setDraft('testimony', 'b')
    removeDraft('prayer_request')
    expect(getDraft('prayer_request')).toBeNull()
    expect(getDraft('testimony')!.content).toBe('b')
  })

  it('is a no-op when the key is absent', () => {
    setDraft('testimony', 'b')
    removeDraft('prayer_request')
    expect(getDraft('testimony')!.content).toBe('b')
  })
})

describe('clearAllComposerDrafts', () => {
  it('wipes the entire storage key', () => {
    setDraft('prayer_request', 'a')
    setDraft('qotd', 'b')
    clearAllComposerDrafts()
    expect(localStorage.getItem(COMPOSER_DRAFTS_KEY)).toBeNull()
    expect(getDraft('prayer_request')).toBeNull()
    expect(getDraft('qotd')).toBeNull()
  })
})

describe('expiry / TTL', () => {
  it('returns null + removes record when expired (T8 storage side)', () => {
    // Inject a record that's 1 second past the 7-day TTL.
    const expired = {
      prayer_request: {
        content: 'old',
        updatedAt: Date.now() - DRAFT_EXPIRY_MS - 1000,
      },
    }
    localStorage.setItem(COMPOSER_DRAFTS_KEY, JSON.stringify(expired))
    expect(getDraft('prayer_request')).toBeNull()
    // Side effect: the expired record was cleaned up.
    const raw = localStorage.getItem(COMPOSER_DRAFTS_KEY)
    const remaining = raw ? JSON.parse(raw) : {}
    expect(remaining.prayer_request).toBeUndefined()
  })

  it('keeps records inside the TTL window', () => {
    const fresh = {
      prayer_request: {
        content: 'fresh',
        updatedAt: Date.now() - 1000,
      },
    }
    localStorage.setItem(COMPOSER_DRAFTS_KEY, JSON.stringify(fresh))
    expect(getDraft('prayer_request')!.content).toBe('fresh')
  })

  it('isDraftExpired honors a custom `now`', () => {
    const record = { content: 'x', updatedAt: 1_000_000 }
    expect(isDraftExpired(record, 1_000_000 + DRAFT_EXPIRY_MS - 1)).toBe(false)
    expect(isDraftExpired(record, 1_000_000 + DRAFT_EXPIRY_MS + 1)).toBe(true)
  })
})
