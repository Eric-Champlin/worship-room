// Journal reflection — frontend service layer.
//
// Calls the backend proxy; on ANY error (HTTP 4xx/5xx, network, timeout, parse,
// shape mismatch), falls through to the existing mock in
// @/mocks/daily-experience-mock-data. User never sees a raw error state — the
// mock's canned reflections are the graceful-degradation floor.

import type { JournalReflection } from '@/types/daily-experience'
import { getJournalReflection } from '@/mocks/daily-experience-mock-data'

const PROXY_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/reflect-journal`
const REQUEST_TIMEOUT_MS = 30_000 // matches backend WebClient timeout

interface JournalReflectionEnvelope {
  data: JournalReflection
  meta?: { requestId?: string }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetches a reflection on a journal entry from the backend proxy. Falls through
 * to the local mock on any failure, so callers never need to handle errors — a
 * valid JournalReflection is always returned.
 *
 * Journal is the highest-stakes emotional surface. If the backend is down,
 * Gemini is slow, or the network is flaky, the user still gets a thoughtful
 * reflection from the curated mock reflections.
 *
 * Shape floor: require `id`, `typeof text === 'string'`, and `text.length >= 20`.
 * The 20-char floor is intentionally below the backend's 50-char floor — both
 * the backend fallback (~290 chars) and the crisis response (~460 chars) pass.
 * Anything below 20 chars is definitely malformed.
 */
export async function fetchJournalReflection(entry: string): Promise<JournalReflection> {
  try {
    const response = await fetchWithTimeout(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry }),
    })

    if (!response.ok) {
      return getJournalReflection()
    }

    const envelope = (await response.json()) as JournalReflectionEnvelope
    if (
      !envelope.data ||
      !envelope.data.id ||
      typeof envelope.data.text !== 'string' ||
      envelope.data.text.length < 20
    ) {
      return getJournalReflection()
    }

    return envelope.data
  } catch {
    return getJournalReflection()
  }
}
