import { describe, it, expect } from 'vitest'
import type { VerseSelection } from '@/types/verse-actions'
import { buildAskUrl } from '../buildAskUrl'

const singleVerse: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world...' }],
}

const rangeSelection: VerseSelection = {
  book: 'romans',
  bookName: 'Romans',
  chapter: 8,
  startVerse: 28,
  endVerse: 29,
  verses: [
    { number: 28, text: 'We know that all things work together for good...' },
    { number: 29, text: 'For those whom he foreknew...' },
  ],
}

describe('buildAskUrl', () => {
  it('builds /ask URL for a single verse', () => {
    const url = buildAskUrl(singleVerse)
    expect(url).toContain('/ask?')
    const q = new URLSearchParams(url.slice(url.indexOf('?'))).get('q')
    expect(q).toBe('Help me understand John 3:16: "For God so loved the world..."')
  })

  it('uses en-dash in reference for a range', () => {
    const url = buildAskUrl(rangeSelection)
    const q = new URLSearchParams(url.slice(url.indexOf('?'))).get('q')
    expect(q).toContain('Romans 8:28–29')
  })

  it('joins verse texts with space for a range', () => {
    const url = buildAskUrl(rangeSelection)
    const q = new URLSearchParams(url.slice(url.indexOf('?'))).get('q')
    expect(q).toContain(
      'We know that all things work together for good... For those whom he foreknew...',
    )
  })

  it('URL-encodes special characters in verse text', () => {
    const specialChars: VerseSelection = {
      book: 'psalms',
      bookName: 'Psalms',
      chapter: 23,
      startVerse: 1,
      endVerse: 1,
      verses: [{ number: 1, text: 'Yahweh is my shepherd; I shall lack nothing.' }],
    }
    const url = buildAskUrl(specialChars)
    // URL should be properly encoded (no unencoded spaces in path)
    expect(url).not.toContain(' ')
    const q = new URLSearchParams(url.slice(url.indexOf('?'))).get('q')
    expect(q).toContain('Yahweh is my shepherd; I shall lack nothing.')
  })

  it('wraps verse text in double-quotes', () => {
    const url = buildAskUrl(singleVerse)
    const q = new URLSearchParams(url.slice(url.indexOf('?'))).get('q')
    expect(q).toMatch(/^Help me understand .+: ".+"$/)
  })
})
