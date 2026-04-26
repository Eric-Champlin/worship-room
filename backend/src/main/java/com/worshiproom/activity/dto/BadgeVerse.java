package com.worshiproom.activity.dto;

/**
 * Scripture verse attached to a {@link BadgeDefinition}. Present on 9
 * badges in the catalog: {@code level_1..level_6}, {@code plans_10},
 * {@code bible_book_10}, {@code bible_book_66}. Verbatim port of the
 * frontend {@code BadgeDefinition.verse} field shape.
 *
 * @param text       full verse text in WEB translation (no leading/trailing whitespace)
 * @param reference  human-readable reference, sometimes including translation suffix
 *                   (e.g., "Psalm 119:105 WEB"); ports verbatim from frontend
 */
public record BadgeVerse(String text, String reference) {}
