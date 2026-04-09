import { formatReference } from '@/lib/dailyHub/verseContext'
import type { ActivityItem } from '@/types/my-bible'

/** Split on whitespace, lowercase, filter empties */
export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Build a single lowercase haystack string for an activity item.
 * verseText is optional because it's async-loaded — items without
 * loaded verse text still match on body/label/reference.
 */
export function getSearchableText(item: ActivityItem, verseText?: string | null): string {
  const parts: string[] = []

  if (verseText) parts.push(verseText)

  const d = item.data
  if (d.type === 'note') parts.push(d.body)
  if (d.type === 'journal') parts.push(d.body)
  if (d.type === 'bookmark' && d.label) parts.push(d.label)

  // Reference: "John 3:16" or "Romans 8:28-30"
  parts.push(formatReference(item.bookName, item.chapter, item.startVerse, item.endVerse))

  return parts.join(' ').toLowerCase()
}

/** Returns true if every query token is a substring of the haystack. Empty query -> true for all. */
export function matchesSearch(item: ActivityItem, query: string, verseText?: string | null): boolean {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return true

  const haystack = getSearchableText(item, verseText)
  return tokens.every((token) => haystack.includes(token))
}
