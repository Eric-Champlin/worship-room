package com.worshiproom.post.engagement.dto;

import java.util.Map;
import java.util.UUID;

/**
 * Viewer's reactions, keyed by post UUID.
 *
 * <p>Posts where the viewer has neither reacted nor bookmarked are NOT in
 * the map (frontend treats absence as both-false). Map iteration order is
 * not guaranteed and not relied on (frontend uses key lookups, not iteration).
 *
 * <p>Spec 3.4 Divergence 3: candle reactions are NOT included; Phase 6.6
 * Answered Wall extends this DTO with {@code isCandled}.
 */
public record ReactionsResponse(Map<UUID, PerPostReaction> reactions) {}
