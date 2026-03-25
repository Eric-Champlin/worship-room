import { useCallback, useState } from 'react'

import { BIBLE_NOTES_KEY, MAX_NOTES } from '@/constants/bible'
import { useAuth } from '@/hooks/useAuth'
import type { BibleNote } from '@/types/bible'

function readNotes(): BibleNote[] {
  try {
    const raw = localStorage.getItem(BIBLE_NOTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as BibleNote[]
  } catch {
    return []
  }
}

function writeNotes(data: BibleNote[]): void {
  try {
    localStorage.setItem(BIBLE_NOTES_KEY, JSON.stringify(data))
  } catch {
    // Silently fail on quota exceeded
  }
}

export function useBibleNotes(): {
  getNotesForChapter: (book: string, chapter: number) => BibleNote[]
  getNoteForVerse: (book: string, chapter: number, verseNumber: number) => BibleNote | undefined
  saveNote: (book: string, chapter: number, verseNumber: number, text: string) => boolean
  deleteNote: (id: string) => void
  getAllNotes: () => BibleNote[]
} {
  const { isAuthenticated } = useAuth()
  const [notes, setNotes] = useState<BibleNote[]>(readNotes)

  const getNotesForChapter = useCallback(
    (book: string, chapter: number): BibleNote[] => {
      return notes.filter((n) => n.book === book && n.chapter === chapter)
    },
    [notes],
  )

  const getNoteForVerse = useCallback(
    (book: string, chapter: number, verseNumber: number): BibleNote | undefined => {
      return notes.find(
        (n) => n.book === book && n.chapter === chapter && n.verseNumber === verseNumber,
      )
    },
    [notes],
  )

  const saveNote = useCallback(
    (book: string, chapter: number, verseNumber: number, text: string): boolean => {
      if (!isAuthenticated) return false

      const current = readNotes()
      const existingIndex = current.findIndex(
        (n) => n.book === book && n.chapter === chapter && n.verseNumber === verseNumber,
      )

      let updated: BibleNote[]

      if (existingIndex !== -1) {
        // Update existing note
        updated = current.map((n, i) =>
          i === existingIndex
            ? { ...n, text, updatedAt: new Date().toISOString() }
            : n,
        )
      } else {
        // Check limit before adding new
        if (current.length >= MAX_NOTES) {
          return false
        }

        const now = new Date().toISOString()
        const newNote: BibleNote = {
          id: crypto.randomUUID(),
          book,
          chapter,
          verseNumber,
          text,
          createdAt: now,
          updatedAt: now,
        }
        updated = [...current, newNote]
      }

      writeNotes(updated)
      setNotes(updated)
      return true
    },
    [isAuthenticated],
  )

  const deleteNote = useCallback(
    (id: string): void => {
      if (!isAuthenticated) return

      const current = readNotes()
      const updated = current.filter((n) => n.id !== id)
      writeNotes(updated)
      setNotes(updated)
    },
    [isAuthenticated],
  )

  const getAllNotes = useCallback((): BibleNote[] => {
    return notes
  }, [notes])

  return {
    getNotesForChapter,
    getNoteForVerse,
    saveNote,
    deleteNote,
    getAllNotes,
  }
}
