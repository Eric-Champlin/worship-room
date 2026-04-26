package com.worshiproom.activity.dto;

import java.util.Collections;
import java.util.Map;
import java.util.Set;

/**
 * Bible reading progress: book slug -> set of completed chapter numbers.
 * Mirrors frontend {@code wr_bible_progress} ({@code Record<string, number[]>}).
 *
 * <p>The snapshot uses {@code Set<Integer>} for chapter uniqueness;
 * Spec 2.6's caller is responsible for de-duplicating on assembly.
 *
 * @param chaptersByBook unmodifiable map; empty map represents "no progress yet"
 */
public record BibleProgressSnapshot(Map<String, Set<Integer>> chaptersByBook) {

    public BibleProgressSnapshot {
        chaptersByBook = chaptersByBook == null ? Map.of() : Collections.unmodifiableMap(chaptersByBook);
    }

    public static BibleProgressSnapshot empty() {
        return new BibleProgressSnapshot(Map.of());
    }
}
