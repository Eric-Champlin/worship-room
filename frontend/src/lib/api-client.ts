/**
 * Envelope-aware fetch wrapper.
 *
 * - Prepends VITE_API_BASE_URL when path starts with '/'
 * - Attaches Authorization: Bearer <token> when a token is stored (unless skipAuth)
 * - Parses the standard { data, meta } envelope and returns `data` typed
 * - On 401 clears stored token and dispatches `wr:auth-invalidated` on window
 * - Throws typed ApiError for non-2xx responses
 * - 30s default timeout via AbortController
 *
 * New auth code (Spec 1.9) and future Phase 2+ code use this client. Existing
 * services (journal-reflection-service.ts, google-local-support-service.ts,
 * FCBH readiness) keep their own fetch wrappers — incremental migration is a
 * future spec, not 1.9 scope.
 *
 * Introduced by Spec 1.9 (Frontend AuthContext JWT Migration, Phase 1).
 */

import { getStoredToken, clearStoredToken } from './auth-storage'
import { ApiError } from '@/types/auth'

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Event fired on window when an authenticated request returns 401. AuthContext
 * listens for this and performs a clean logout (clears state, clears legacy
 * keys). The event is dispatched at most once per stale-token lifecycle.
 */
export const AUTH_INVALIDATED_EVENT = 'wr:auth-invalidated'

export interface ApiFetchOptions extends Omit<RequestInit, 'signal'> {
  /** Override default timeout of 30 seconds */
  timeoutMs?: number
  /**
   * When true, skip Bearer token attachment (e.g., login/register endpoints).
   * Also suppresses the 401 → clear-token + auth-invalidated-event side effect
   * (login 401s are not stale-token conditions).
   */
  skipAuth?: boolean
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  if (!path.startsWith('/')) return base + '/' + path
  return base + path
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, skipAuth = false, headers, ...rest } =
    options
  const url = resolveUrl(path)

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }
  if (!skipAuth) {
    const token = getStoredToken()
    if (token) mergedHeaders.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timer)
    // AbortError (timeout) + network error both route here — undifferentiated
    // on purpose. The UI surface uses the same "couldn't reach the server" copy
    // for either case.
    throw new ApiError(
      'NETWORK_ERROR',
      0,
      'Unable to reach the server.',
      null,
    )
  }
  clearTimeout(timer)

  // 204 No Content — return undefined as T (logout path)
  if (response.status === 204) return undefined as T

  // Parse body (may be JSON or empty or plain text)
  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      /* not JSON — leave null; message falls through to statusText / text */
    }
  }

  if (!response.ok) {
    const errBody = (body ?? {}) as Record<string, unknown>
    const code =
      typeof errBody.code === 'string' ? errBody.code : 'UNKNOWN'
    const message =
      typeof errBody.message === 'string'
        ? errBody.message
        : text || response.statusText
    const requestId =
      typeof errBody.requestId === 'string' ? errBody.requestId : null
    const fieldErrors =
      errBody.fieldErrors && typeof errBody.fieldErrors === 'object'
        ? (errBody.fieldErrors as Record<string, string>)
        : undefined

    if (response.status === 401 && !skipAuth) {
      // Authenticated request returned 401 → token is stale. Clear + signal.
      // The explicit !skipAuth gate prevents login endpoint 401s (which use
      // skipAuth=true) from clobbering an in-flight token state.
      clearStoredToken()
      try {
        window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT))
      } catch {
        /* no-op — ssr / test environments without window dispatch */
      }
    }

    throw new ApiError(code, response.status, message, requestId, fieldErrors)
  }

  // Success envelope: { data, meta? } — return body.data typed as T
  const successBody = (body ?? {}) as { data?: unknown }
  return successBody.data as T
}
