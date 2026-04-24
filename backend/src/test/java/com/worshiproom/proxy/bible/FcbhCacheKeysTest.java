package com.worshiproom.proxy.bible;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FcbhCacheKeysTest {

    @Test
    void biblesKey_normalizesCase() {
        assertThat(FcbhCacheKeys.biblesKey("eng")).isEqualTo("bibles:eng");
        assertThat(FcbhCacheKeys.biblesKey("ENG")).isEqualTo("bibles:eng");
        assertThat(FcbhCacheKeys.biblesKey(" eng ")).isEqualTo("bibles:eng");
    }

    @Test
    void biblesKey_defaultsWhenBlank() {
        assertThat(FcbhCacheKeys.biblesKey(null)).isEqualTo("bibles:eng");
        assertThat(FcbhCacheKeys.biblesKey("")).isEqualTo("bibles:eng");
        assertThat(FcbhCacheKeys.biblesKey("   ")).isEqualTo("bibles:eng");
    }

    @Test
    void filesetKey_uppercasesAndTrims() {
        assertThat(FcbhCacheKeys.filesetKey("engwebn2da")).isEqualTo("fileset:ENGWEBN2DA");
        assertThat(FcbhCacheKeys.filesetKey("  ENGWEBN2DA  ")).isEqualTo("fileset:ENGWEBN2DA");
        assertThat(FcbhCacheKeys.filesetKey("En1WebN2Da")).isEqualTo("fileset:EN1WEBN2DA");
    }

    @Test
    void chapterKey_composesAllThreeParts() {
        assertThat(FcbhCacheKeys.chapterKey("en1webn2da", "jhn", 3))
            .isEqualTo("chapter:EN1WEBN2DA:JHN:3");
        assertThat(FcbhCacheKeys.chapterKey("EN1WEBN2DA", "JHN", 3))
            .isEqualTo("chapter:EN1WEBN2DA:JHN:3");
        assertThat(FcbhCacheKeys.chapterKey(" EN1WEBN2DA ", " JHN ", 150))
            .isEqualTo("chapter:EN1WEBN2DA:JHN:150");
    }
}
