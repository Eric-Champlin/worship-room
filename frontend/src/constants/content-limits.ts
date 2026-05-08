import type { PostType } from '@/constants/post-types'

/** Content length limits for user-generated content */

export const PRAYER_POST_MAX_LENGTH = 1000
export const QOTD_MAX_LENGTH = 500
export const QOTD_WARNING_THRESHOLD = 400
export const JOURNAL_MAX_LENGTH = 5000
export const JOURNAL_WARNING_THRESHOLD = 4000
export const JOURNAL_DANGER_THRESHOLD = 4800

// Spec 4.3 — Testimony post type extends content-limit surface to 5000 chars.
// Backend ceiling is 5000 across CreatePostRequest.content / UpdatePostRequest.content
// (raised from 2000 in 4.3); per-type service-layer check enforces 2000 for prayer_request,
// 5000 for testimony. The frontend asymmetry (prayer_request 1000 client, 2000 server) is
// preserved per MPD-2.

export const TESTIMONY_POST_MAX_LENGTH = 5000
export const TESTIMONY_POST_WARNING_THRESHOLD = 4000
export const TESTIMONY_POST_DANGER_THRESHOLD = 4800
export const TESTIMONY_POST_VISIBLE_AT = 2500

interface PostTypeLimit {
  max: number
  warningAt: number
  dangerAt: number
  visibleAt: number
}

// Per-type limit map for the InlineComposer to consume.
// 4.4–4.6 will tune question / discussion / encouragement entries when each type ships;
// for now they default to prayer_request limits so the composer doesn't crash if those
// post types reach it before their respective specs ship.
export const POST_TYPE_LIMITS: Record<PostType, PostTypeLimit> = {
  prayer_request: {
    max: PRAYER_POST_MAX_LENGTH,
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
  testimony: {
    max: TESTIMONY_POST_MAX_LENGTH,
    warningAt: TESTIMONY_POST_WARNING_THRESHOLD,
    dangerAt: TESTIMONY_POST_DANGER_THRESHOLD,
    visibleAt: TESTIMONY_POST_VISIBLE_AT,
  },
  question: {
    max: PRAYER_POST_MAX_LENGTH,
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
  discussion: {
    max: PRAYER_POST_MAX_LENGTH,
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
  encouragement: {
    max: PRAYER_POST_MAX_LENGTH, // 4.6 will lower this to 280
    warningAt: 800,
    dangerAt: 960,
    visibleAt: 500,
  },
} as const
