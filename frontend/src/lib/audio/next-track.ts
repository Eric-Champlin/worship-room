/**
 * BB-29 — Next-track resolver for continuous playback / auto-advance.
 *
 * Pure async helper that, given a currently playing `PlayerTrack`, returns
 * the next playable `PlayerTrack` in canonical Bible order, a sentinel for
 * end-of-Bible (after Revelation 22), or throws a `DbpError` after 3
 * consecutive missing chapters.
 *
 * Resolution cascade:
 *   1. `getAdjacentChapter(slug, chapter, 'next')` for the next position.
 *   2. If null → `{ kind: 'end-of-bible' }`.
 *   3. Resolve DBP fileset + book code for that slug.
 *   4. In-memory cache hit → return immediately.
 *   5. Fetch from DBP. On HTTP 404, skip to the next chapter and retry
 *      (up to 3 consecutive misses). On other errors, throw immediately.
 *   6. On success, cache the URL and return the PlayerTrack.
 *
 * The `deps.fetchChapterAudio` injection seam lets tests swap the DBP
 * client for a fake without the complexity of module mocking.
 */

import type { DbpError, PlayerTrack } from '@/types/bible-audio'
import { getAdjacentChapter } from '@/data/bible'
import {
  resolveFcbhBookCode,
  resolveFcbhFilesetForBook,
} from '@/lib/audio/book-codes'
import { getCachedChapterAudio, setCachedChapterAudio } from '@/lib/audio/audio-cache'
import { getChapterAudio } from '@/lib/audio/dbp-client'

export type NextTrackResult =
  | { kind: 'track'; track: PlayerTrack }
  | { kind: 'end-of-bible' }

const MAX_CONSECUTIVE_MISSES = 3

export interface ResolveNextTrackDeps {
  fetchChapterAudio?: typeof getChapterAudio
}

export async function resolveNextTrack(
  currentTrack: PlayerTrack,
  deps: ResolveNextTrackDeps = {},
): Promise<NextTrackResult> {
  const fetchChapterAudio = deps.fetchChapterAudio ?? getChapterAudio

  let cursor: { bookSlug: string; chapter: number } = {
    bookSlug: currentTrack.book,
    chapter: currentTrack.chapter,
  }
  let missCount = 0
  let lastError: DbpError | null = null

  while (true) {
    const adjacent = getAdjacentChapter(cursor.bookSlug, cursor.chapter, 'next')
    if (!adjacent) {
      return { kind: 'end-of-bible' }
    }

    const nextSlug = adjacent.bookSlug
    const nextChapter = adjacent.chapter
    const nextBookDisplayName = adjacent.bookName

    const filesetId = resolveFcbhFilesetForBook(nextSlug)
    const bookCode = resolveFcbhBookCode(nextSlug)
    if (!filesetId || !bookCode) {
      // Unresolvable — defensive skip.
      cursor = { bookSlug: nextSlug, chapter: nextChapter }
      missCount += 1
      if (missCount >= MAX_CONSECUTIVE_MISSES) {
        throw (
          lastError ??
          ({
            kind: 'parse',
            message: 'DBP book code unresolvable',
          } satisfies DbpError)
        )
      }
      continue
    }

    // Cache hit?
    const cached = getCachedChapterAudio(filesetId, bookCode, nextChapter)
    if (cached) {
      return {
        kind: 'track',
        track: {
          filesetId,
          book: nextSlug,
          bookDisplayName: nextBookDisplayName,
          chapter: nextChapter,
          translation: currentTrack.translation,
          url: cached.url,
        },
      }
    }

    // DBP fetch
    try {
      const audio = await fetchChapterAudio(filesetId, bookCode, nextChapter)
      setCachedChapterAudio(filesetId, bookCode, nextChapter, audio)
      return {
        kind: 'track',
        track: {
          filesetId,
          book: nextSlug,
          bookDisplayName: nextBookDisplayName,
          chapter: nextChapter,
          translation: currentTrack.translation,
          url: audio.url,
        },
      }
    } catch (err) {
      const dbpErr = err as DbpError
      lastError = dbpErr
      if (dbpErr.kind === 'http' && dbpErr.status === 404) {
        cursor = { bookSlug: nextSlug, chapter: nextChapter }
        missCount += 1
        if (missCount >= MAX_CONSECUTIVE_MISSES) {
          throw dbpErr
        }
        continue
      }
      // Non-404 errors — rethrow immediately, no skip.
      throw dbpErr
    }
  }
}
