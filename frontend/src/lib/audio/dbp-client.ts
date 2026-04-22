/**
 * BB-26 — FCBH Digital Bible Platform v4 client.
 *
 * Spec 4 (ai-proxy-fcbh) migrated this module from direct DBP calls to
 * the backend proxy at /api/v1/proxy/bible/*. All four functions keep
 * identical signatures. `DbpError` shape unchanged. The book_id validation
 * for `getChapterAudio` stays verbatim — it guards against DBP's silent
 * invalid-book-code fallback to 1 Chronicles.
 *
 * Endpoints:
 *   GET /api/v1/proxy/bible/bibles?language=eng
 *   GET /api/v1/proxy/bible/filesets/{filesetId}
 *   GET /api/v1/proxy/bible/filesets/{filesetId}/{bookCode}/{chapter}
 *   GET /api/v1/proxy/bible/timestamps/{filesetId}/{bookCode}/{chapter}
 *
 * The backend response envelope wraps the DBP envelope:
 *   { data: { data: [...], meta: {...} }, meta: { requestId } }
 * `proxyFetch` unwraps the outer ProxyResponse layer and returns the inner
 * DBP envelope; each public function unwraps DBP's `{data: [...]}` to its
 * final typed shape.
 */

import type {
  DbpBible,
  DbpChapterAudio,
  DbpError,
  DbpFileset,
  VerseTimestamp,
} from '@/types/bible-audio'

const PROXY_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/bible`
const REQUEST_TIMEOUT_MS = 10_000

interface ProxyEnvelope<T> {
  data: T
  meta?: { requestId?: string }
}

interface DbpDataEnvelope<T> {
  data: T
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDbpError(e: unknown): e is DbpError {
  return typeof e === 'object' && e !== null && 'kind' in (e as Record<string, unknown>)
}

async function proxyFetch<TDbpBody>(path: string): Promise<TDbpBody> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${PROXY_BASE}${path}`, { signal: controller.signal })
    if (!response.ok) {
      throw {
        kind: 'http',
        status: response.status,
        message: `Proxy ${response.status}`,
      } satisfies DbpError
    }
    let envelope: ProxyEnvelope<TDbpBody>
    try {
      envelope = (await response.json()) as ProxyEnvelope<TDbpBody>
    } catch {
      throw { kind: 'parse', message: 'Proxy returned invalid JSON' } satisfies DbpError
    }
    if (!isObject(envelope) || envelope.data === undefined) {
      throw { kind: 'parse', message: 'Proxy envelope missing data field' } satisfies DbpError
    }
    return envelope.data
  } catch (e) {
    if (isObject(e) && (e as { name?: string }).name === 'AbortError') {
      throw { kind: 'timeout', message: 'Proxy request timed out' } satisfies DbpError
    }
    if (isDbpError(e)) throw e
    const message = e instanceof Error ? e.message : 'Network error'
    throw { kind: 'network', message } satisfies DbpError
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Lists audio bibles. Returns DBP bibles array unwrapped from the double envelope. */
export async function listAudioBibles(languageCode = 'eng'): Promise<DbpBible[]> {
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/bibles?language=${encodeURIComponent(languageCode)}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data)) {
    throw { kind: 'parse', message: 'DBP bibles list missing data array' } satisfies DbpError
  }
  return dbp.data as DbpBible[]
}

/** Returns the filesets catalog for a single bible id. */
export async function getBibleFilesets(bibleId: string): Promise<DbpFileset[]> {
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/filesets/${encodeURIComponent(bibleId)}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data)) {
    throw { kind: 'parse', message: 'DBP filesets response missing data array' } satisfies DbpError
  }
  return dbp.data as DbpFileset[]
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
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/filesets/${encodeURIComponent(filesetId)}/${encodeURIComponent(bookCode)}/${chapter}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data) || dbp.data.length === 0) {
    throw { kind: 'parse', message: 'DBP chapter audio response missing data' } satisfies DbpError
  }
  const entry = dbp.data[0]
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

/** Raw DBP timestamp entry before parsing. */
interface DbpTimestampRaw {
  book: string
  chapter: string
  verse_start: string
  verse_start_alt: string
  timestamp: number
}

/**
 * BB-44 — Fetches verse-level timing data for a chapter.
 * Returns parsed VerseTimestamp[] (filtered: verse 0 removed, sorted by timestamp).
 * Returns empty array if no timing data exists (OT dramatized filesets return empty).
 */
export async function getChapterTimestamps(
  filesetId: string,
  bookCode: string,
  chapter: number,
): Promise<VerseTimestamp[]> {
  const dbp = await proxyFetch<DbpDataEnvelope<unknown>>(
    `/timestamps/${encodeURIComponent(filesetId)}/${encodeURIComponent(bookCode)}/${chapter}`,
  )
  if (!isObject(dbp) || !Array.isArray(dbp.data)) return []

  const entries = dbp.data as DbpTimestampRaw[]
  return entries
    .filter((e) => {
      const v = parseInt(e.verse_start, 10)
      return !isNaN(v) && v > 0 // Filter out verse 0 (chapter intro marker)
    })
    .map((e) => ({
      verse: parseInt(e.verse_start, 10),
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}
