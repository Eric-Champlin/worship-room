package com.worshiproom.proxy.maps;

import java.util.List;
import java.util.Map;

/**
 * Response body for {@code POST /api/v1/proxy/maps/places-search}.
 *
 * <p>{@code places} is intentionally typed as {@code List<Map<String, Object>>}
 * — this is the raw Google Places API v1 {@code places} array passed through
 * unchanged so the frontend's existing {@code google-places-mapper.ts} can
 * continue consuming it without a backend type coupling. See
 * {@code _specs/ai-proxy-maps.md} Architecture Decision #2.
 */
public record PlacesSearchResponse(
    List<Map<String, Object>> places,
    String nextPageToken
) {}
