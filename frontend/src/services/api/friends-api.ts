/**
 * Friends API client — Spec 2.5.4 (Frontend Friends Dual-Write).
 *
 * Wraps the Spec 2.5.3 friend-mutation endpoints as fire-and-forget calls
 * from useFriends. localStorage stays the source of truth for reads; the
 * backend receives a shadow copy. Failures are logged at the call site
 * (console.warn) and never block UX.
 *
 * Authorization header is attached automatically by apiFetch from auth-storage.
 *
 * Shapes: imports from frontend/src/types/api/friends.ts (hand-typed, shipped
 * with Spec 2.5.3). When the openapi-typescript pipeline ships, the types
 * file regenerates and this module's imports remain stable.
 */

import { apiFetch } from '@/lib/api-client'
import type {
  FriendRequestDto,
  FriendRequestAction,
  SendFriendRequestRequest,
  RespondToFriendRequestRequest,
  BlockUserRequest,
} from '@/types/api/friends'

/**
 * POST /api/v1/users/me/friend-requests — send a friend request.
 * Returns the FriendRequestDto including the backend's UUID `id`, which the
 * caller (useFriends) attaches to the local FriendRequest via attachBackendId.
 */
export async function sendFriendRequestApi(
  toUserId: string,
  message: string | null,
): Promise<FriendRequestDto> {
  const body: SendFriendRequestRequest = { toUserId, message }
  return apiFetch<FriendRequestDto>('/api/v1/users/me/friend-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * PATCH /api/v1/friend-requests/{backendRequestId} — accept, decline, or cancel.
 * The backend dispatches on the `action` field; response body is discarded
 * (caller doesn't need confirmation — localStorage is the contract).
 */
export async function respondToFriendRequestApi(
  backendRequestId: string,
  action: FriendRequestAction,
): Promise<void> {
  const body: RespondToFriendRequestRequest = { action }
  await apiFetch<unknown>(`/api/v1/friend-requests/${backendRequestId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * DELETE /api/v1/users/me/friends/{friendUserId} — remove a friend.
 * No body. apiFetch's default Content-Type=application/json header is harmless
 * on a body-less DELETE; the backend ignores it.
 */
export async function removeFriendApi(friendUserId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/users/me/friends/${friendUserId}`, {
    method: 'DELETE',
  })
}

/**
 * POST /api/v1/users/me/blocks — block a user. Idempotent on re-block.
 */
export async function blockUserApi(userId: string): Promise<void> {
  const body: BlockUserRequest = { userId }
  await apiFetch<void>('/api/v1/users/me/blocks', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
