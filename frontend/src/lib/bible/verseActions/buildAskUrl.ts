import { formatReference, getSelectionText } from '@/lib/bible/verseActionRegistry'
import type { VerseSelection } from '@/types/verse-actions'

export function buildAskUrl(selection: VerseSelection): string {
  const reference = formatReference(selection)
  const verseText = getSelectionText(selection)
  const q = `Help me understand ${reference}: "${verseText}"`
  const params = new URLSearchParams({ q })
  return `/ask?${params.toString()}`
}
