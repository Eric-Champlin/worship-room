/**
 * Spec 6.1 — Prayer Receipt types.
 *
 * Wire format is camelCase to match the rest of `/api/v1/posts/**` (PostDto,
 * ToggleReactionResponse, etc.).
 *
 * Privacy invariant (Gate-32 — backend-enforced):
 *   totalCount === attributedIntercessors.length + anonymousCount
 *
 * Non-friend reactor identities (userId, displayName, avatarUrl) NEVER appear
 * on the wire — only the friend subset of reactors is serialized.
 */

export type AttributedIntercessor = {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export type PrayerReceiptResponse = {
  totalCount: number
  attributedIntercessors: AttributedIntercessor[]
  anonymousCount: number
}
