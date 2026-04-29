package com.worshiproom.post.dto;

/**
 * Response shape for {@code GET /api/v1/qotd/today}.
 *
 * <p>Exposes only the fields the frontend renders. The internal rotation
 * metadata ({@code display_order}, {@code is_active}, {@code created_at}) is
 * NOT exposed — those are server-side concerns documented in {@code QotdService}.
 *
 * @param id    Stable id, {@code "qotd-1"} through {@code "qotd-72"}
 * @param text  Question text rendered as the {@code <h2>} on Prayer Wall
 * @param theme One of {@code faith_journey | practical | reflective | encouraging | community | seasonal}
 * @param hint  Optional helper text rendered as the italic line beneath the question; nullable
 */
public record QotdQuestionResponse(String id, String text, String theme, String hint) {}
