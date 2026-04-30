/**
 * Reports API client — Spec 3.8.
 *
 * Wraps the Spec 3.8 report-write endpoints. Used by ReportDialog when the
 * user submits a report against a post or comment.
 *
 * Authorization header is attached automatically by apiFetch from auth-storage.
 * 401 errors propagate through apiFetch's global handling (token cleared,
 * `wr:auth-invalidated` dispatched, AuthModal opens).
 *
 * Other errors (404, 429, 400 SELF_REPORT) throw `ApiError` for the caller
 * to map into user-facing toasts.
 */

import { apiFetch } from '@/lib/api-client'

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'self_harm'
  | 'sexual'
  | 'other'

export interface ReportResult {
  reportId: string
  created: boolean
}

/**
 * POST /api/v1/posts/{postId}/reports — submit a report against a post.
 *
 * Idempotent on PENDING: a second submission against the same post by the
 * same reporter while a previous report is still pending returns the existing
 * report id with `created=false`.
 */
export async function reportPost(
  postId: string,
  reason: ReportReason,
  details?: string,
): Promise<ReportResult> {
  const body: { reason: ReportReason; details?: string } = { reason }
  if (details && details.trim().length > 0) {
    body.details = details
  }
  return apiFetch<ReportResult>(
    `/api/v1/posts/${encodeURIComponent(postId)}/reports`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

/**
 * POST /api/v1/comments/{commentId}/reports — submit a report against a comment.
 *
 * Same idempotent semantics and shared rate-limit bucket as `reportPost`.
 *
 * Wired here for backend completeness; no UI consumes it in Spec 3.8 (deferred
 * per MPD-3 / D15 — see `_plans/post-1.10-followups.md`).
 */
export async function reportComment(
  commentId: string,
  reason: ReportReason,
  details?: string,
): Promise<ReportResult> {
  const body: { reason: ReportReason; details?: string } = { reason }
  if (details && details.trim().length > 0) {
    body.details = details
  }
  return apiFetch<ReportResult>(
    `/api/v1/comments/${encodeURIComponent(commentId)}/reports`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}
