export type EchoKind = 'highlighted' | 'memorized' | 'read-on-this-day'

export interface Echo {
  /** Stable ID: `echo:${kind}:${book}:${chapter}:${startVerse}-${endVerse}` */
  id: string
  kind: EchoKind
  /** Book slug (e.g. "john") */
  book: string
  /** Display name (e.g. "John") */
  bookName: string
  chapter: number
  /** 0 for read-on-this-day (chapter-level) */
  startVerse: number
  /** 0 for read-on-this-day (chapter-level) */
  endVerse: number
  /** Verse content — empty for highlights until async-resolved, empty for read-on-this-day */
  text: string
  /** Formatted reference: "John 3:16" or "John 3:16-17" or "John 3" */
  reference: string
  /** Human-readable: "a week ago", "on this day last year", etc. */
  relativeLabel: string
  /** Epoch ms of original engagement */
  occurredAt: number
  score: number
}

export interface EchoOptions {
  limit?: number
  kinds?: EchoKind[]
}
