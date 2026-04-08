import type { VerseSelection } from '@/types/verse-actions'

export function buildDailyHubVerseUrl(
  tab: 'pray' | 'journal' | 'meditate',
  selection: VerseSelection,
): string {
  const params = new URLSearchParams({
    tab,
    verseBook: selection.book,
    verseChapter: String(selection.chapter),
    verseStart: String(selection.startVerse),
    verseEnd: String(selection.endVerse),
    src: 'bible',
  })
  return `/daily?${params.toString()}`
}
