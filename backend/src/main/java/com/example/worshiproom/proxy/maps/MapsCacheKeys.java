package com.example.worshiproom.proxy.maps;

import java.util.Locale;

/**
 * Cache-key construction for {@link GoogleMapsService}'s three Caffeine caches.
 *
 * <p>Package-private — only {@code GoogleMapsService} uses these helpers.
 * Centralizing the normalization logic here ensures cache reads and writes
 * produce the same key for the same logical request (e.g., "CHURCH" and
 * "church" hit the same entry).
 *
 * <p>All lowercasing uses {@link Locale#ROOT} to avoid locale-dependent
 * surprises (e.g., Turkish-i).
 */
final class MapsCacheKeys {
    private MapsCacheKeys() {}

    /**
     * Search key: lat/lng to 4 decimal places (~11m precision), normalized
     * keyword, plus pageToken when present.
     */
    static String searchKey(double lat, double lng, int radiusMiles, String keyword, String pageToken) {
        String normalizedKeyword = keyword.trim().toLowerCase(Locale.ROOT);
        String tokenPart = (pageToken == null || pageToken.isEmpty()) ? "" : ":" + pageToken;
        return String.format(Locale.ROOT, "%.4f,%.4f:%d:%s%s",
            lat, lng, radiusMiles, normalizedKeyword, tokenPart);
    }

    /** Geocode key: trimmed, lowercased query. Matches the frontend cache strategy. */
    static String geocodeKey(String query) {
        return query.trim().toLowerCase(Locale.ROOT);
    }

    /** Photo key: the Google photo name itself. Already a stable opaque ID. */
    static String photoKey(String name) {
        return name;
    }
}
