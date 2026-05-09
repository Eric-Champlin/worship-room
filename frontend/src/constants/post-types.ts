/**
 * Canonical post-type definitions for the unified posts table (Phase 4.1).
 *
 * The `id` field MUST match the backend Java PostType enum's `value()` strings
 * character-for-character. The drift test in __tests__/post-types.test.ts is
 * the contract — see that file's top comment for the sync rule.
 */
export const POST_TYPES = [
  {
    id: 'prayer_request',
    label: 'Prayer request',
    pluralLabel: 'Prayer requests',
    icon: 'HandHelping',
    description: 'Lift up a need to the Lord with the community.',
    enabled: true,
  },
  {
    id: 'testimony',
    label: 'Testimony',
    pluralLabel: 'Testimonies',
    icon: 'Sparkles',
    description: 'Share what God has done in your life.',
    enabled: true,
  },
  {
    id: 'question',
    label: 'Question',
    pluralLabel: 'Questions',
    icon: 'HelpCircle',
    description: 'Ask the community for wisdom or perspective.',
    enabled: true,
  },
  {
    id: 'discussion',
    label: 'Discussion',
    pluralLabel: 'Discussions',
    icon: 'MessagesSquare',
    description: 'Open a thread on a passage or topic worth exploring.',
    enabled: true,
  },
  {
    id: 'encouragement',
    label: 'Encouragement',
    pluralLabel: 'Encouragements',
    icon: 'Heart',
    description: 'Speak a word of life over the community.',
    enabled: true,
  },
] as const

export type PostType = (typeof POST_TYPES)[number]['id']

export type PostTypeEntry = (typeof POST_TYPES)[number]

export function isValidPostType(value: string | null): value is PostType {
  if (value === null) return false
  return POST_TYPES.some((t) => t.id === value)
}

export function getPostType(id: PostType): PostTypeEntry {
  const entry = POST_TYPES.find((t) => t.id === id)
  if (!entry) {
    throw new Error(
      `Unknown post type id: ${id}. Did you mean one of: ${POST_TYPES.map((t) => t.id).join(', ')}`,
    )
  }
  return entry
}
