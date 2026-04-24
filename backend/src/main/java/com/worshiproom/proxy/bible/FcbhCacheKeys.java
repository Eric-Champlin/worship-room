package com.worshiproom.proxy.bible;

import java.util.Locale;

/**
 * Static helpers for cache-key normalization. Uppercasing and whitespace
 * trimming ensure case-insensitive cache hits — "eng" and "ENG" hit the
 * same bibles entry; "ENGWEB" and "engweb" hit the same fileset entry.
 */
public final class FcbhCacheKeys {

    private FcbhCacheKeys() {}

    public static String biblesKey(String language) {
        String normalized = (language == null || language.isBlank())
            ? "eng"
            : language.trim().toLowerCase(Locale.ROOT);
        return "bibles:" + normalized;
    }

    public static String filesetKey(String filesetId) {
        return "fileset:" + filesetId.trim().toUpperCase(Locale.ROOT);
    }

    public static String chapterKey(String filesetId, String bookCode, int chapter) {
        return "chapter:"
            + filesetId.trim().toUpperCase(Locale.ROOT)
            + ":"
            + bookCode.trim().toUpperCase(Locale.ROOT)
            + ":"
            + chapter;
    }
}
