package com.worshiproom.post.dto;

import java.util.List;

/**
 * Spec 6.5 — feed-inline summary embedded in each PostDto. {@code count} is the
 * total number of {@code 'praying'} reactions on the post; {@code firstThree}
 * is the most-recent 3 (or fewer) classified intercessor entries the viewer
 * is authorized to see.
 *
 * <p>Posts with 0 reactions: {@code count=0, firstThree=List.of()} — NOT null,
 * so the frontend summary-line formatter can branch on count without
 * Optional-chaining everywhere.
 */
public record IntercessorSummary(
        long count,
        List<IntercessorEntry> firstThree
) {}
