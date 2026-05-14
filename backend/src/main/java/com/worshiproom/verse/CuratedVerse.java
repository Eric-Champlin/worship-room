package com.worshiproom.verse;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Set;

/**
 * One curated verse entry from {@code verses/verse-finds-you.json}.
 *
 * <p>{@code excludedContexts} is a defensive lever per spec D-ExcludedContexts:
 * a verse can be tagged for one purpose but flagged "do not surface in this
 * context." The selection engine excludes the verse if any
 * {@code excluded_contexts} tag overlaps the post's context tag set.
 */
public record CuratedVerse(
    String id,
    String reference,
    String text,
    String translation,
    Set<String> tags,
    @JsonProperty("excluded_contexts") Set<String> excludedContexts,
    @JsonProperty("approximate_length") int approximateLength
) {}
