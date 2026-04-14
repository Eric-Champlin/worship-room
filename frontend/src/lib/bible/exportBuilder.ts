import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllBookmarks } from '@/lib/bible/bookmarkStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import { getAllJournalEntries } from '@/lib/bible/journalStore'
import { getPlansState } from '@/lib/bible/plansStore'
import { getPrayers } from '@/services/prayer-list-storage'
import { getMeditationHistory } from '@/services/meditation-storage'
import { CURRENT_SCHEMA_VERSION, APP_VERSION } from '@/types/bible-export'
import type { BibleExportV2 } from '@/types/bible-export'

export function buildExport(): BibleExportV2 {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      highlights: getAllHighlights(),
      bookmarks: getAllBookmarks(),
      notes: getAllNotes(),
      prayers: getPrayers().filter((p) => p.verseContext != null),
      journals: getAllJournalEntries().filter((j) => j.verseContext != null),
      meditations: getMeditationHistory().filter((m) => m.verseContext != null),
      plans: getPlansState(),
    },
  }
}
