package com.worshiproom.post.engagement.dto;

import java.util.Map;
import java.util.UUID;

/**
 * Viewer's reactions, keyed by post UUID.
 *
 * <p>Posts where the viewer has neither reacted (praying, candle, or
 * praising) nor bookmarked are NOT in the map (frontend treats absence as
 * all-false). Map iteration order is not guaranteed and not relied on
 * (frontend uses key lookups, not iteration).
 *
 * <p>Spec 3.7 extended {@link PerPostReaction} with {@code isCandle}; the
 * read-side now reflects both reaction types (Spec 3.4 Divergence 3 — candle
 * excluded — is superseded). Spec 6.6 Answered Wall added
 * {@code isPraising} for the praising reaction on answered prayers.
 *
 * <p>No visibility filtering — the response reflects the viewer's own
 * engagement history. Frontend joins this map with the visible-post-list
 * from {@code GET /api/v1/posts} at render time.
 */
public record ReactionsResponse(Map<UUID, PerPostReaction> reactions) {}
