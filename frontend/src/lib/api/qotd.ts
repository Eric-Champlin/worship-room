import { apiFetch } from '@/lib/api-client'
import type { QuestionOfTheDay } from '@/constants/question-of-the-day'

/**
 * Backend response shape for GET /api/v1/qotd/today.
 *
 * Mirrors backend QotdQuestionResponse (Spec 3.9). The `theme` enum widens to
 * a string literal union matching the backend CHECK constraint and the frontend
 * `QuestionOfTheDay.theme` discriminator.
 *
 * Hand-typed; will be replaced by openapi-typescript-generated types when the
 * codegen pipeline ships (Forums Wave Phase 1 followup).
 */
export interface QotdTodayResponse {
  id: string
  text: string
  theme:
    | 'faith_journey'
    | 'practical'
    | 'reflective'
    | 'encouraging'
    | 'community'
    | 'seasonal'
  hint: string | null
}

/**
 * Fetch today's QOTD from the backend. Skips auth attachment because the endpoint
 * is public (declared in PublicPaths.OPTIONAL_AUTH_PATTERNS server-side).
 *
 * Throws ApiError on non-2xx; the caller (useQotdToday) catches and falls back
 * to the local constants path (Spec 3.9 D6).
 */
export async function fetchTodaysQuestion(): Promise<QotdTodayResponse> {
  return apiFetch<QotdTodayResponse>('/api/v1/qotd/today', {
    method: 'GET',
    skipAuth: true,
  })
}

/**
 * Convert backend response to the frontend QuestionOfTheDay shape.
 * Backend nullable hint → frontend optional hint.
 */
export function adaptQotdResponse(r: QotdTodayResponse): QuestionOfTheDay {
  return {
    id: r.id,
    text: r.text,
    theme: r.theme,
    ...(r.hint != null ? { hint: r.hint } : {}),
  }
}
