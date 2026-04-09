import { BIBLE_JOURNAL_ENTRIES_KEY } from '@/constants/bible'
import type { JournalEntry } from '@/types/bible'

// --- Module-level state ---
let cache: JournalEntry[] | null = null
const listeners = new Set<() => void>()

// --- Error class ---
export class JournalStorageFullError extends Error {
  constructor() {
    super('Storage full — clear some journal entries to free space.')
    this.name = 'JournalStorageFullError'
  }
}

// --- ID generation ---
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// --- Validation ---
function isValidJournalEntry(record: unknown): record is JournalEntry {
  if (typeof record !== 'object' || record === null) return false
  const r = record as Record<string, unknown>
  if (
    typeof r.id !== 'string' ||
    typeof r.body !== 'string' ||
    typeof r.createdAt !== 'number' ||
    typeof r.updatedAt !== 'number'
  ) {
    return false
  }
  if (r.verseContext !== undefined) {
    if (typeof r.verseContext !== 'object' || r.verseContext === null) return false
    const vc = r.verseContext as Record<string, unknown>
    if (
      typeof vc.book !== 'string' ||
      typeof vc.chapter !== 'number' ||
      typeof vc.startVerse !== 'number' ||
      typeof vc.endVerse !== 'number' ||
      typeof vc.reference !== 'string'
    ) {
      return false
    }
  }
  return true
}

// --- Storage I/O ---
function readFromStorage(): JournalEntry[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(BIBLE_JOURNAL_ENTRIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidJournalEntry)
  } catch {
    return []
  }
}

function writeToStorage(data: JournalEntry[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BIBLE_JOURNAL_ENTRIES_KEY, JSON.stringify(data))
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      throw new JournalStorageFullError()
    }
  }
}

function getCache(): JournalEntry[] {
  if (cache === null) {
    cache = readFromStorage()
  }
  return cache
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

// --- Read API ---
export function getAllJournalEntries(): JournalEntry[] {
  return [...getCache()]
}

export function getJournalEntriesForVerse(book: string, chapter: number, verse: number): JournalEntry[] {
  return getCache().filter(
    (entry) =>
      entry.verseContext &&
      entry.verseContext.book === book &&
      entry.verseContext.chapter === chapter &&
      verse >= entry.verseContext.startVerse &&
      verse <= entry.verseContext.endVerse,
  )
}

export function getJournalEntryById(id: string): JournalEntry | null {
  return getCache().find((entry) => entry.id === id) ?? null
}

// --- Write API ---
export function createJournalEntry(body: string, verseContext?: JournalEntry['verseContext']): JournalEntry {
  const now = Date.now()
  const entry: JournalEntry = {
    id: generateId(),
    body,
    createdAt: now,
    updatedAt: now,
    ...(verseContext && { verseContext }),
  }

  const entries = getCache()
  cache = [entry, ...entries]
  writeToStorage(cache)
  notifyListeners()
  return entry
}

export function updateJournalEntry(id: string, body: string): JournalEntry {
  const entries = getCache()
  const idx = entries.findIndex((entry) => entry.id === id)
  if (idx === -1) {
    throw new Error(`Journal entry not found: ${id}`)
  }

  const updated = { ...entries[idx], body, updatedAt: Date.now() }
  cache = entries.map((entry, i) => (i === idx ? updated : entry))
  writeToStorage(cache)
  notifyListeners()
  return updated
}

export function deleteJournalEntry(id: string): void {
  const entries = getCache()
  const filtered = entries.filter((entry) => entry.id !== id)
  if (filtered.length === entries.length) return

  cache = filtered
  writeToStorage(cache)
  notifyListeners()
}

// --- Subscription ---
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// --- Testing ---
export function _resetCacheForTesting(): void {
  cache = null
}
