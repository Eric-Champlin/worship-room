package com.worshiproom.verse.dto;

/**
 * Response DTO carrying just the verse reference + text. Plain text only —
 * React escapes on render; no HTML rendering for any verse content (T37).
 *
 * <p>Wire format: camelCase, matching {@code com.worshiproom.post.dto} convention
 * (see {@code PrayerReceiptResponse} class JavaDoc).
 */
public record VerseDto(
    String reference,
    String text
) {}
