/**
 * Friends API types — Spec 2.5.3.
 *
 * Hand-typed to match the OpenAPI schemas at
 * `backend/src/main/resources/openapi.yaml`. The openapi-typescript codegen
 * pipeline is not yet wired (per `03-backend-standards.md` § "OpenAPI Spec and
 * Type Generation" — "hand-typed in the interim"). When the pipeline ships,
 * regenerate via `npm run types:generate` and replace this file with the
 * generated module.
 *
 * @see _specs/forums/spec-2-5-3.md
 */

export type FriendRequestDirection = 'incoming' | 'outgoing';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type FriendRequestAction = 'accept' | 'decline' | 'cancel';

export type LevelName =
  | 'Seedling'
  | 'Sprout'
  | 'Blooming'
  | 'Flourishing'
  | 'Oak'
  | 'Lighthouse';

export interface FriendDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  levelName: LevelName;
  currentStreak: number;
  faithPoints: number;
  weeklyPoints: number;
  /** ISO-8601 timestamp; null if the friend has never been active. */
  lastActive: string | null;
}

export interface FriendRequestDto {
  id: string;
  /** Set on outgoing/sendFriendRequest responses; null on incoming list responses. */
  fromUserId: string | null;
  /** Set on incoming/sendFriendRequest responses; null on outgoing list responses. */
  toUserId: string | null;
  otherPartyDisplayName: string | null;
  otherPartyAvatarUrl: string | null;
  message: string | null;
  status: FriendRequestStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface UserSearchResultDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface SendFriendRequestRequest {
  toUserId: string;
  message?: string | null;
}

export interface RespondToFriendRequestRequest {
  action: FriendRequestAction;
}

export interface BlockUserRequest {
  userId: string;
}

/** Response body for PATCH /api/v1/friend-requests/{id}. */
export interface RespondToFriendRequestResponse {
  status: 'accepted' | 'declined' | 'cancelled';
}

/** Response body data for POST /api/v1/users/me/blocks. */
export interface BlockUserResponse {
  blockedUserId: string;
  /** ISO-8601 timestamp. */
  blockedAt: string;
}
