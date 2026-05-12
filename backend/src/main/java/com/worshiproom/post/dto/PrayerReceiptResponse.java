package com.worshiproom.post.dto;

import java.util.List;

/**
 * Author-only Prayer Receipt response (Spec 6.1).
 *
 * <p>Wire format uses camelCase to match the rest of the post API
 * (see PostDto, e.g. {@code prayingCount}). Plan v1 of Spec 6.1
 * called for snake_case here, but the existing API contract is
 * camelCase across {@code /api/v1/posts/**}, so we hew to convention.
 *
 * <p>Invariant (enforced server-side by {@link com.worshiproom.post.PrayerReceiptService}):
 * {@code totalCount == attributedIntercessors.size() + anonymousCount}.
 *
 * <p>Privacy invariant: {@code anonymousCount} reactors' user_id /
 * display_name / avatar_url are NEVER on the wire (W31, Gate-32).
 */
public record PrayerReceiptResponse(
        long totalCount,
        List<AttributedIntercessor> attributedIntercessors,
        long anonymousCount
) {}
