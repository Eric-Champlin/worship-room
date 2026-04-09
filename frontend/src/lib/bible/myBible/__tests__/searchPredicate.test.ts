import { describe, expect, it } from 'vitest'
import type { ActivityItem } from '@/types/my-bible'
import { getSearchableText, matchesSearch, tokenizeQuery } from '../searchPredicate'

// --- Factories ---

function makeItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    type: 'highlight',
    id: 'item-1',
    createdAt: 1000,
    updatedAt: 1000,
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    data: { type: 'highlight', color: 'joy' },
    ...overrides,
  }
}

function makeNote(body: string, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return makeItem({
    type: 'note',
    data: { type: 'note', body },
    ...overrides,
  })
}

function makeJournal(body: string, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return makeItem({
    type: 'journal',
    data: { type: 'journal', body, reference: 'John 3:16' },
    ...overrides,
  })
}

function makeBookmark(label?: string, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return makeItem({
    type: 'bookmark',
    data: { type: 'bookmark', label },
    ...overrides,
  })
}

// --- Tests ---

describe('tokenizeQuery', () => {
  it('splits on whitespace and lowercases', () => {
    expect(tokenizeQuery('Anxious Peace')).toEqual(['anxious', 'peace'])
  })

  it('trims leading/trailing whitespace', () => {
    expect(tokenizeQuery('  joy  ')).toEqual(['joy'])
  })

  it('returns empty array for empty string', () => {
    expect(tokenizeQuery('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(tokenizeQuery('   ')).toEqual([])
  })
})

describe('getSearchableText', () => {
  it('includes verseText when provided', () => {
    const item = makeItem()
    const haystack = getSearchableText(item, 'For God so loved the world')
    expect(haystack).toContain('for god so loved the world')
  })

  it('works without verseText', () => {
    const item = makeNote('feeling anxious today')
    const haystack = getSearchableText(item)
    expect(haystack).toContain('feeling anxious today')
    expect(haystack).toContain('john 3:16')
  })

  it('includes note body', () => {
    const item = makeNote('A beautiful reflection on grace')
    const haystack = getSearchableText(item)
    expect(haystack).toContain('a beautiful reflection on grace')
  })

  it('includes journal body', () => {
    const item = makeJournal('Today I prayed for patience')
    const haystack = getSearchableText(item)
    expect(haystack).toContain('today i prayed for patience')
  })

  it('includes bookmark label', () => {
    const item = makeBookmark('My favorite verse')
    const haystack = getSearchableText(item)
    expect(haystack).toContain('my favorite verse')
  })

  it('includes formatted reference', () => {
    const item = makeItem({
      bookName: 'Romans',
      chapter: 8,
      startVerse: 28,
      endVerse: 28,
    })
    const haystack = getSearchableText(item)
    expect(haystack).toContain('romans 8:28')
  })

  it('omits label for bookmark without label', () => {
    const item = makeBookmark(undefined)
    const haystack = getSearchableText(item)
    expect(haystack).not.toContain('undefined')
    expect(haystack).not.toContain('null')
    expect(haystack).toContain('john 3:16')
  })
})

describe('matchesSearch', () => {
  it('returns true for empty query', () => {
    expect(matchesSearch(makeItem(), '')).toBe(true)
  })

  it('matches single word in note body', () => {
    const item = makeNote('feeling anxious today')
    expect(matchesSearch(item, 'anxious')).toBe(true)
  })

  it('does not match single word not in item', () => {
    const item = makeNote('feeling joyful')
    expect(matchesSearch(item, 'anxious')).toBe(false)
  })

  it('matches multi-word AND query', () => {
    const item = makeNote('anxious but finding peace')
    expect(matchesSearch(item, 'anxious peace')).toBe(true)
  })

  it('fails multi-word AND query when one token missing', () => {
    const item = makeNote('anxious but no relief')
    expect(matchesSearch(item, 'anxious peace')).toBe(false)
  })

  it('is case-insensitive', () => {
    const item = makeNote('PEACE and joy')
    expect(matchesSearch(item, 'peace')).toBe(true)
  })

  it('matches reference', () => {
    const item = makeItem({
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
    })
    expect(matchesSearch(item, 'John 3')).toBe(true)
  })

  it('matches verseText', () => {
    const item = makeItem()
    expect(matchesSearch(item, 'loved', 'For God so loved the world')).toBe(true)
  })

  it('works when verseText is null', () => {
    const item = makeNote('feeling peaceful')
    expect(matchesSearch(item, 'peaceful', null)).toBe(true)
  })
})
