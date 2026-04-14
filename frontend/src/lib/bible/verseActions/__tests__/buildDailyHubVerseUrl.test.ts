import { describe, it, expect } from 'vitest'
import type { VerseSelection } from '@/types/verse-actions'
import { buildDailyHubVerseUrl } from '../buildDailyHubVerseUrl'

const singleVerse: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world...' }],
}

describe('buildDailyHubVerseUrl', () => {
  it('builds a pray tab URL for a single verse', () => {
    const url = buildDailyHubVerseUrl('pray', singleVerse)
    expect(url).toBe(
      '/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
    )
  })

  it('builds a journal tab URL', () => {
    const url = buildDailyHubVerseUrl('journal', singleVerse)
    expect(url).toBe(
      '/daily?tab=journal&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
    )
  })

  it('builds a meditate tab URL', () => {
    const url = buildDailyHubVerseUrl('meditate', singleVerse)
    expect(url).toBe(
      '/daily?tab=meditate&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
    )
  })

  it('includes verseEnd for a range selection', () => {
    const range: VerseSelection = {
      book: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 18,
      verses: [
        { number: 16, text: 'For God so loved the world...' },
        { number: 17, text: 'For God did not send...' },
        { number: 18, text: 'He who believes...' },
      ],
    }
    const url = buildDailyHubVerseUrl('pray', range)
    expect(url).toBe(
      '/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=18&src=bible',
    )
  })

  it('handles a numbered book slug like 1-corinthians', () => {
    const numbered: VerseSelection = {
      book: '1-corinthians',
      bookName: '1 Corinthians',
      chapter: 13,
      startVerse: 4,
      endVerse: 4,
      verses: [{ number: 4, text: 'Love is patient...' }],
    }
    const url = buildDailyHubVerseUrl('pray', numbered)
    expect(url).toBe(
      '/daily?tab=pray&verseBook=1-corinthians&verseChapter=13&verseStart=4&verseEnd=4&src=bible',
    )
  })

  it('handles a multi-word book slug like song-of-solomon', () => {
    const multiWord: VerseSelection = {
      book: 'song-of-solomon',
      bookName: 'Song of Solomon',
      chapter: 2,
      startVerse: 1,
      endVerse: 1,
      verses: [{ number: 1, text: 'I am a rose of Sharon...' }],
    }
    const url = buildDailyHubVerseUrl('journal', multiWord)
    expect(url).toBe(
      '/daily?tab=journal&verseBook=song-of-solomon&verseChapter=2&verseStart=1&verseEnd=1&src=bible',
    )
  })
})
