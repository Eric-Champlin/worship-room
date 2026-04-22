// Ask AI — frontend service layer.
//
// Calls the backend proxy; on ANY error (HTTP 4xx/5xx, network, timeout, parse),
// falls through to the existing mock in @/mocks/ask-mock-data. User never sees a
// raw error state — the mock's 16 canned responses are the graceful-degradation
// floor.

import type { AskResponse } from '@/types/ask'
import { getAskResponse } from '@/mocks/ask-mock-data'

const PROXY_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/ask`
const REQUEST_TIMEOUT_MS = 30_000

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

interface AskEnvelope {
  data: AskResponse
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
 * Fetches a Scripture-grounded answer from the backend proxy. Falls through to
 * the local mock on any failure, so callers never need to handle errors — a
 * valid AskResponse is always returned.
 *
 * The mock fallback is intentional: Ask must never show a raw error. If the
 * backend is down, Gemini is slow, or the network is flaky, the user still gets
 * a thoughtful response from the 16 curated mock topics.
 */
export async function fetchAskResponse(
  question: string,
  conversationHistory?: ConversationTurn[],
): Promise<AskResponse> {
  try {
    const body = {
      question,
      conversationHistory:
        conversationHistory && conversationHistory.length > 0 ? conversationHistory : null,
    }
    const response = await fetchWithTimeout(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return getAskResponse(question)
    }

    const envelope = (await response.json()) as AskEnvelope
    if (!envelope.data || !envelope.data.id || !Array.isArray(envelope.data.verses)) {
      return getAskResponse(question)
    }

    return envelope.data
  } catch {
    return getAskResponse(question)
  }
}
