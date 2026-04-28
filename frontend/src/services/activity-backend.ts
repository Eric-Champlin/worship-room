import { apiFetch } from '@/lib/api-client';
import type { ActivityRequest } from '@/types/api/activity';
import type { ActivityType } from '@/types/dashboard';

/**
 * Fire-and-forget POST to /api/v1/activity. Spec 2.7 dual-write.
 *
 * NEVER awaited by callers — failures are logged and swallowed.
 * The backend is a shadow copy; localStorage stays canonical for reads.
 * Authorization header is attached automatically by apiFetch via auth-storage.
 *
 * `apiFetch<void>` matches the existing pattern at auth-service.ts:131 for
 * endpoints whose response is intentionally discarded.
 */
export async function postActivityToBackend(
  type: ActivityType,
  sourceFeature: string,
): Promise<void> {
  const body: ActivityRequest = {
    activityType: type,
    sourceFeature,
  };
  await apiFetch<void>('/api/v1/activity', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
