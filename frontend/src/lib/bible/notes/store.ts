import { BIBLE_NOTES_STORAGE_KEY } from '@/constants/bible'
import type { Note } from '@/types/bible'
import type { MergeResult } from '@/types/bible-export'

// --- Module-level state ---
let cache: Note[] | null = null
const listeners = new Set<() => void>()

// --- Error class ---
export class NoteStorageFullError extends Error {
  constructor() {
    super('Storage full — clear some notes to free space.')
    this.name = 'NoteStorageFullError'
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
function isValidNote(record: unknown): record is Note {
  if (typeof record !== 'object' || record === null) return false
  const r = record as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.book === 'string' &&
    typeof r.chapter === 'number' &&
    typeof r.startVerse === 'number' &&
    typeof r.endVerse === 'number' &&
    typeof r.body === 'string' &&
    typeof r.createdAt === 'number' &&
    typeof r.updatedAt === 'number'
  )
}

// --- Storage I/O ---
function readFromStorage(): Note[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(BIBLE_NOTES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidNote)
  } catch {
    return []
  }
}

function writeToStorage(data: Note[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BIBLE_NOTES_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      throw new NoteStorageFullError()
    }
  }
}

function getCache(): Note[] {
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

function rangesOverlap(
  a: { startVerse: number; endVerse: number },
  b: { startVerse: number; endVerse: number },
): boolean {
  return a.startVerse <= b.endVerse && a.endVerse >= b.startVerse
}

// --- Read API ---
export function getAllNotes(): Note[] {
  return [...getCache()]
}

export function getNotesForChapter(book: string, chapter: number): Note[] {
  return getCache().filter((n) => n.book === book && n.chapter === chapter)
}

export function getNoteForVerse(book: string, chapter: number, verse: number): Note | null {
  return (
    getCache().find(
      (n) =>
        n.book === book &&
        n.chapter === chapter &&
        verse >= n.startVerse &&
        verse <= n.endVerse,
    ) ?? null
  )
}

export function getNoteForSelection(selection: {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
}): Note | null {
  return (
    getCache().find(
      (n) =>
        n.book === selection.book &&
        n.chapter === selection.chapter &&
        rangesOverlap(n, selection),
    ) ?? null
  )
}

// --- Write API ---
export function upsertNote(
  selection: { book: string; chapter: number; startVerse: number; endVerse: number },
  body: string,
): Note {
  const notes = getCache()
  const existing = getNoteForSelection(selection)

  if (existing) {
    // Update existing — preserve id, createdAt, range
    const updated: Note = {
      ...existing,
      body,
      updatedAt: Date.now(),
    }
    cache = notes.map((n) => (n.id === existing.id ? updated : n))
    writeToStorage(cache)
    notifyListeners()
    return updated
  }

  // Create new
  const now = Date.now()
  const newNote: Note = {
    id: generateId(),
    book: selection.book,
    chapter: selection.chapter,
    startVerse: selection.startVerse,
    endVerse: selection.endVerse,
    body,
    createdAt: now,
    updatedAt: now,
  }

  cache = [...notes, newNote]
  writeToStorage(cache)
  notifyListeners()
  return newNote
}

export function updateNoteBody(id: string, body: string): void {
  const notes = getCache()
  const idx = notes.findIndex((n) => n.id === id)
  if (idx === -1) return

  if (notes[idx].body === body) return // skip write when unchanged

  const updated: Note = {
    ...notes[idx],
    body,
    updatedAt: Date.now(),
  }

  cache = notes.map((n, i) => (i === idx ? updated : n))
  writeToStorage(cache)
  notifyListeners()
}

export function deleteNote(id: string): void {
  const notes = getCache()
  const filtered = notes.filter((n) => n.id !== id)
  if (filtered.length === notes.length) return

  cache = filtered
  writeToStorage(cache)
  notifyListeners()
}

export function restoreNote(note: Note): void {
  const notes = getCache()
  if (notes.some((n) => n.id === note.id)) return // no duplicates

  cache = [...notes, note]
  writeToStorage(cache)
  notifyListeners()
}

// --- Bulk import API ---

export function replaceAllNotes(records: Note[]): void {
  cache = [...records]
  writeToStorage(cache)
  notifyListeners()
}

export function mergeInNotes(incoming: Note[]): MergeResult {
  const local = getCache()
  const localMap = new Map(local.map((r) => [r.id, r]))
  const result: MergeResult = { added: 0, updated: 0, skipped: 0 }

  for (const record of incoming) {
    const existing = localMap.get(record.id)
    if (!existing) {
      localMap.set(record.id, record)
      result.added++
    } else if (record.updatedAt > existing.updatedAt) {
      localMap.set(record.id, record)
      result.updated++
    } else {
      result.skipped++
    }
  }

  cache = Array.from(localMap.values())
  writeToStorage(cache)
  notifyListeners()
  return result
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
