// Prayer generation — frontend service layer.
//
// Calls the backend proxy; on ANY error (HTTP 4xx/5xx, network, timeout, parse,
// shape mismatch), falls through to the existing mock in
// @/mocks/daily-experience-mock-data. User never sees a raw error state — the
// mock's 10 canned prayers are the graceful-degradation floor.

import type { MockPrayer } from '@/types/daily-experience'
import { getMockPrayer } from '@/mocks/daily-experience-mock-data'

const PROXY_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/pray`
const REQUEST_TIMEOUT_MS = 30_000 // matches backend WebClient timeout

interface PrayerEnvelope {
  data: MockPrayer
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
 * Fetches a personalized prayer from the backend proxy. Falls through to the
 * local mock on any failure, so callers never need to handle errors — a valid
 * MockPrayer is always returned.
 *
 * The mock fallback is intentional: Prayer must never show a raw error. If the
 * backend is down, Gemini is slow, or the network is flaky, the user still
 * gets a thoughtful prayer from the 10 curated mock topics.
 */
export async function fetchPrayer(request: string): Promise<MockPrayer> {
  try {
    const response = await fetchWithTimeout(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request }),
    })

    if (!response.ok) {
      return getMockPrayer(request)
    }

    const envelope = (await response.json()) as PrayerEnvelope
    if (
      !envelope.data ||
      !envelope.data.id ||
      !envelope.data.topic ||
      typeof envelope.data.text !== 'string' ||
      !/^Dear /.test(envelope.data.text) ||
      !/Amen\.\s*$/.test(envelope.data.text)
    ) {
      return getMockPrayer(request)
    }

    return envelope.data
  } catch {
    return getMockPrayer(request)
  }
}
