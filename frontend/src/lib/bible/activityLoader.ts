import { BIBLE_BOOKS } from '@/constants/bible'
import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllBookmarks } from '@/lib/bible/bookmarkStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import { getAllJournalEntries } from '@/lib/bible/journalStore'
import { getMeditationHistory } from '@/services/meditation-storage'
import { matchesSearch } from '@/lib/bible/myBible/searchPredicate'
import type { ActivityItem, ActivityFilter, ActivitySort } from '@/types/my-bible'

function resolveBookName(slug: string): string {
  return BIBLE_BOOKS.find((b) => b.slug === slug)?.name ?? slug
}

export function loadAllActivity(): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const hl of getAllHighlights()) {
    items.push({
      type: 'highlight',
      id: hl.id,
      createdAt: hl.createdAt,
      updatedAt: hl.updatedAt,
      book: hl.book,
      bookName: resolveBookName(hl.book),
      chapter: hl.chapter,
      startVerse: hl.startVerse,
      endVerse: hl.endVerse,
      data: { type: 'highlight', color: hl.color },
    })
  }

  for (const bm of getAllBookmarks()) {
    items.push({
      type: 'bookmark',
      id: bm.id,
      createdAt: bm.createdAt,
      updatedAt: bm.createdAt,
      book: bm.book,
      bookName: resolveBookName(bm.book),
      chapter: bm.chapter,
      startVerse: bm.startVerse,
      endVerse: bm.endVerse,
      data: { type: 'bookmark', label: bm.label },
    })
  }

  for (const note of getAllNotes()) {
    items.push({
      type: 'note',
      id: note.id,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      book: note.book,
      bookName: resolveBookName(note.book),
      chapter: note.chapter,
      startVerse: note.startVerse,
      endVerse: note.endVerse,
      data: { type: 'note', body: note.body },
    })
  }

  for (const session of getMeditationHistory()) {
    if (!session.verseContext) continue
    const vc = session.verseContext
    items.push({
      type: 'meditation',
      id: session.id,
      createdAt: new Date(session.completedAt).getTime(),
      updatedAt: new Date(session.completedAt).getTime(),
      book: vc.book,
      bookName: resolveBookName(vc.book),
      chapter: vc.chapter,
      startVerse: vc.startVerse,
      endVerse: vc.endVerse,
      data: {
        type: 'meditation',
        meditationType: session.type,
        durationMinutes: session.durationMinutes,
        reference: vc.reference,
      },
    })
  }

  for (const entry of getAllJournalEntries()) {
    if (!entry.verseContext) continue
    const vc = entry.verseContext
    items.push({
      type: 'journal',
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      book: vc.book,
      bookName: resolveBookName(vc.book),
      chapter: vc.chapter,
      startVerse: vc.startVerse,
      endVerse: vc.endVerse,
      data: {
        type: 'journal',
        body: entry.body,
        reference: vc.reference,
      },
    })
  }

  return items
}

export function filterActivity(
  items: ActivityItem[],
  filter: ActivityFilter,
  getVerseText?: (book: string, chapter: number, startVerse: number, endVerse: number) => string | null,
): ActivityItem[] {
  let result = items

  if (filter.type !== 'all') {
    result = result.filter((item) => {
      switch (filter.type) {
        case 'highlights':
          return item.type === 'highlight'
        case 'notes':
          return item.type === 'note'
        case 'bookmarks':
          return item.type === 'bookmark'
        case 'daily-hub':
          return item.type === 'meditation' || item.type === 'journal'
      }
    })
  }

  if (filter.book !== 'all') {
    result = result.filter((item) => item.book === filter.book)
  }

  if (filter.type === 'highlights' && filter.color !== 'all') {
    result = result.filter(
      (item) => item.data.type === 'highlight' && item.data.color === filter.color,
    )
  }

  if (filter.searchQuery.trim()) {
    result = result.filter((item) => {
      const vt = getVerseText?.(item.book, item.chapter, item.startVerse, item.endVerse) ?? null
      return matchesSearch(item, filter.searchQuery, vt)
    })
  }

  return result
}

export function sortActivity(items: ActivityItem[], sort: ActivitySort): ActivityItem[] {
  const sorted = [...items]

  if (sort === 'recent') {
    sorted.sort((a, b) => {
      const aTime = Math.max(a.createdAt, a.updatedAt)
      const bTime = Math.max(b.createdAt, b.updatedAt)
      return bTime - aTime
    })
  } else {
    sorted.sort((a, b) => {
      const aIndex = BIBLE_BOOKS.findIndex((book) => book.slug === a.book)
      const bIndex = BIBLE_BOOKS.findIndex((book) => book.slug === b.book)
      if (aIndex !== bIndex) return aIndex - bIndex
      if (a.chapter !== b.chapter) return a.chapter - b.chapter
      return a.startVerse - b.startVerse
    })
  }

  return sorted
}
