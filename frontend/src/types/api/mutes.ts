/**
 * Mute API DTO types — Spec 2.5.7. Hand-written to match the OpenAPI spec
 * paths/{api/v1/mutes,api/v1/mutes/{userId}}. When the openapi-typescript
 * pipeline ships, this file regenerates and the imports in mutes-api.ts
 * remain stable.
 */

/** Body of POST /api/v1/mutes. */
export interface MuteUserRequest {
  userId: string;
}

/** Item in the GET /api/v1/mutes response array. */
export interface MutedUserApiResponse {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  /** ISO 8601 timestamp from user_mutes.created_at. */
  mutedAt: string;
}

/** Response data of POST /api/v1/mutes (under the envelope's `data` key). */
export interface MuteUserResponse {
  mutedUserId: string;
  /** ISO 8601 timestamp. */
  mutedAt: string;
}
