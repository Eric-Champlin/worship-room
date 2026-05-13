package com.worshiproom.post.dto;

import java.util.List;

/**
 * Spec 6.5 — dedicated-endpoint response shape: ordered list of intercessor
 * entries (up to 50) plus a {@code totalCount} for the "and N others"
 * affordance when the post has more reactions than the cap.
 */
public record IntercessorResponse(
        List<IntercessorEntry> entries,
        long totalCount
) {}
