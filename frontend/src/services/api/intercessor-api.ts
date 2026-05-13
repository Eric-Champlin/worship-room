/**
 * Spec 6.5 — Intercessor Timeline API client.
 *
 * Single endpoint: `GET /api/v1/posts/{postId}/intercessors`.
 *
 * Returns the server-classified entries (named for the viewer's friends + self;
 * anonymous otherwise) plus a totalCount for the "and N others" affordance
 * when more than 50 reactions exist.
 *
 * Cache-Control on the wire is `private, no-store` (per-viewer classification
 * boundary) so this client never caches responses. Each tap-to-expand makes
 * a fresh request.
 */

import { apiFetch } from '@/lib/api-client'
import type { IntercessorResponse } from '@/types/intercessor'

export async function fetchIntercessors(
  postId: string,
): Promise<IntercessorResponse> {
  return apiFetch<IntercessorResponse>(`/api/v1/posts/${postId}/intercessors`)
}
