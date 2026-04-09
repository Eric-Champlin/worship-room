import type { BibleExportV1, ImportResult } from '@/types/bible-export'
import { replaceAllHighlights, mergeInHighlights } from '@/lib/bible/highlightStore'
import { replaceAllBookmarks, mergeInBookmarks } from '@/lib/bible/bookmarkStore'
import { replaceAllNotes, mergeInNotes } from '@/lib/bible/notes/store'
import { replaceAllJournals, mergeInJournals } from '@/lib/bible/journalStore'
import { replaceAllPrayers, mergeInPrayers } from '@/services/prayer-list-storage'
import { replaceAllMeditations, mergeInMeditations } from '@/services/meditation-storage'

export function applyReplace(data: BibleExportV1['data']): ImportResult {
  replaceAllHighlights(data.highlights)
  replaceAllBookmarks(data.bookmarks)
  replaceAllNotes(data.notes)
  replaceAllJournals(data.journals)
  replaceAllPrayers(data.prayers)
  replaceAllMeditations(data.meditations)

  const total =
    data.highlights.length +
    data.bookmarks.length +
    data.notes.length +
    data.prayers.length +
    data.journals.length +
    data.meditations.length

  return {
    mode: 'replace',
    totalItems: total,
    highlights: { added: data.highlights.length, updated: 0, skipped: 0 },
    bookmarks: { added: data.bookmarks.length, updated: 0, skipped: 0 },
    notes: { added: data.notes.length, updated: 0, skipped: 0 },
    prayers: { added: data.prayers.length, updated: 0, skipped: 0 },
    journals: { added: data.journals.length, updated: 0, skipped: 0 },
    meditations: { added: data.meditations.length, updated: 0, skipped: 0 },
  }
}

export function applyMerge(data: BibleExportV1['data']): ImportResult {
  const highlights = mergeInHighlights(data.highlights)
  const bookmarks = mergeInBookmarks(data.bookmarks)
  const notes = mergeInNotes(data.notes)
  const journals = mergeInJournals(data.journals)
  const prayers = mergeInPrayers(data.prayers)
  const meditations = mergeInMeditations(data.meditations)

  const total =
    highlights.added + highlights.updated +
    bookmarks.added + bookmarks.updated +
    notes.added + notes.updated +
    journals.added + journals.updated +
    prayers.added + prayers.updated +
    meditations.added + meditations.updated

  return {
    mode: 'merge',
    totalItems: total,
    highlights,
    bookmarks,
    notes,
    prayers,
    journals,
    meditations,
  }
}
