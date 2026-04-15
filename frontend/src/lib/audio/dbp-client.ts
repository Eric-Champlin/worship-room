/**
 * BB-26 — FCBH Digital Bible Platform v4 API client.
 *
 * Pure transport layer. Caching lives in `audio-cache.ts`. Error conversion
 * to user-facing strings lives in `error-messages.ts`. This module throws
 * typed `DbpError` objects on failure and does not retry.
 *
 * Endpoints (confirmed by _plans/recon/bb26-audio-foundation.md):
 *   GET /bibles?language_code=eng
 *     → { data: DbpBible[], meta }
 *   GET /bibles/filesets/{filesetId}
 *     → { data: DbpFileset[] | any, meta }  — 260-929 entries; used sparingly
 *   GET /bibles/filesets/{filesetId}/{bookCode}/{chapter}
 *     → { data: [{ book_id, chapter_start, path, ... }], meta }  (1-element
 *       array, the per-chapter shortcut)
 */

import { requireFcbhApiKey } from '@/lib/env'
import type {
  DbpBible,
  DbpChapterAudio,
  DbpError,
  DbpFileset,
} from '@/types/bible-audio'

const DBP_BASE_URL = 'https://4.dbt.io/api'
const DBP_TIMEOUT_MS = 10_000

/** Pure helper — appends `?v=4&key=...` to a path, preserving any existing query. */
function buildUrl(path: string, key: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${DBP_BASE_URL}${path}${separator}v=4&key=${encodeURIComponent(key)}`
}

function isDbpError(e: unknown): e is DbpError {
  return typeof e === 'object' && e !== null && 'kind' in (e as Record<string, unknown>)
}

async function dbpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let key: string
  try {
    key = requireFcbhApiKey()
  } catch {
    throw { kind: 'missing-key', message: 'FCBH API key is not configured' } satisfies DbpError
  }

  const url = buildUrl(path, key)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DBP_TIMEOUT_MS)

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      throw {
        kind: 'http',
        status: response.status,
        message: `DBP ${response.status}`,
      } satisfies DbpError
    }
    try {
      return (await response.json()) as T
    } catch {
      throw { kind: 'parse', message: 'DBP returned invalid JSON' } satisfies DbpError
    }
  } catch (e) {
    // AbortController → AbortError
    if (
      typeof e === 'object' &&
      e !== null &&
      (e as { name?: string }).name === 'AbortError'
    ) {
      throw { kind: 'timeout', message: 'DBP request timed out' } satisfies DbpError
    }
    if (isDbpError(e)) throw e
    const message = e instanceof Error ? e.message : 'Network error'
    throw { kind: 'network', message } satisfies DbpError
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Assert that `value` is an object, useful for defensive response shape checks. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

interface DbpEnvelope<T> {
  data: T
}

/** Lists audio bibles for a given language. */
export async function listAudioBibles(languageCode = 'eng'): Promise<DbpBible[]> {
  const raw = await dbpFetch<DbpEnvelope<unknown>>(
    `/bibles?language_code=${encodeURIComponent(languageCode)}`,
  )
  if (!isObject(raw) || !Array.isArray(raw.data)) {
    throw { kind: 'parse', message: 'DBP bibles list missing data array' } satisfies DbpError
  }
  return raw.data as DbpBible[]
}

/** Returns the filesets catalog for a single bible id. */
export async function getBibleFilesets(bibleId: string): Promise<DbpFileset[]> {
  const raw = await dbpFetch<DbpEnvelope<unknown>>(
    `/bibles/filesets/${encodeURIComponent(bibleId)}`,
  )
  if (!isObject(raw) || !Array.isArray(raw.data)) {
    throw { kind: 'parse', message: 'DBP filesets response missing data array' } satisfies DbpError
  }
  return raw.data as DbpFileset[]
}

/**
 * Returns the audio URL for a specific chapter.
 *
 * Defensive book_id validation guards against the recon-documented DBP bug
 * where an invalid book code returns a 200 OK pointing at a 1 Chronicles
 * fallback. We compare `response.data[0].book_id` to the requested bookCode
 * (case-insensitive) and throw `parse` on mismatch. Without this guard, a
 * slug→code typo in `book-codes.ts` would silently play a random 3-hour
 * 1 Chronicles recording when the user tapped "Nehemiah 5".
 */
export async function getChapterAudio(
  filesetId: string,
  bookCode: string,
  chapter: number,
): Promise<DbpChapterAudio> {
  const raw = await dbpFetch<DbpEnvelope<unknown>>(
    `/bibles/filesets/${encodeURIComponent(filesetId)}/${encodeURIComponent(
      bookCode,
    )}/${chapter}`,
  )
  if (!isObject(raw) || !Array.isArray(raw.data) || raw.data.length === 0) {
    throw { kind: 'parse', message: 'DBP chapter audio response missing data' } satisfies DbpError
  }
  const entry = raw.data[0]
  if (!isObject(entry)) {
    throw { kind: 'parse', message: 'DBP chapter audio entry is not an object' } satisfies DbpError
  }
  const returnedBook = typeof entry.book_id === 'string' ? entry.book_id : undefined
  const url = typeof entry.path === 'string' ? entry.path : undefined
  if (!returnedBook || !url) {
    throw { kind: 'parse', message: 'DBP chapter audio entry missing book_id or path' } satisfies DbpError
  }
  // Case-insensitive book_id match — guards against DBP's silent invalid-book-code
  // fallback to 1 Chronicles. See recon § 4 "Failure modes observed / Invalid book code".
  if (returnedBook.toLowerCase() !== bookCode.toLowerCase()) {
    throw { kind: 'parse', message: 'DBP returned wrong book' } satisfies DbpError
  }
  const durationSeconds =
    typeof entry.duration === 'number'
      ? entry.duration
      : typeof entry.length === 'number'
      ? entry.length
      : undefined
  return {
    book: returnedBook,
    chapter,
    url,
    durationSeconds,
  }
}
