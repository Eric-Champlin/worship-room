package com.worshiproom.verse;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Validates the curated 180-passage set against the Spec 6.8 curation rules.
 *
 * <p><b>STATUS:</b> Gate-G-CURATION-PREREQ resolved 2026-05-14. Eric's 180-passage
 * content lives at {@code backend/src/main/resources/verses/verse-finds-you.json};
 * these tests run against it on every CI pass. CC must NOT generate placeholder
 * content — per Spec 6.8 §0 the curation is a human pastoral-discernment
 * deliverable.
 *
 * <p>If the curation file is ever emptied or removed, these tests will fail
 * loudly (curation-floor + every-entry-has-fields assertions). That is
 * intentional — silent regression of the curated set would be a Gate-G-CURATION-PREREQ
 * violation.
 *
 * <p>The seven tests below cover Spec 6.8 §10's T26–T30 + T7 (NOT-hope) + the curation
 * floor. Word-count threshold is 40 (the brief allows ~35 with flex; 40 accommodates
 * Isaiah 41:10 at 38 words — see Step 4 execution-log reconciliation).
 */
@SpringBootTest
class CuratedVerseSetValidationTest {

    /** Sane floor: brief allows "fewer and safer" — don't pin to exactly 180, but reject empty/skeleton. */
    private static final int CURATION_FLOOR = 30;
    private static final Pattern KEBAB_ID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)+$");

    @Autowired private VerseCatalog catalog;

    @Test
    @DisplayName("Entry count meets the curation floor")
    void entryCountMeetsFloor() {
        assertThat(catalog.entries()).hasSizeGreaterThanOrEqualTo(CURATION_FLOOR);
    }

    @Test
    @DisplayName("Every entry has all required fields populated")
    void everyEntryHasRequiredFields() {
        for (CuratedVerse v : catalog.entries()) {
            assertThat(v.id()).as("id of %s", v.reference()).isNotBlank();
            assertThat(KEBAB_ID.matcher(v.id()).matches()).as("id format of %s", v.id()).isTrue();
            assertThat(v.reference()).isNotBlank();
            assertThat(v.text()).isNotBlank();
            assertThat(v.translation()).isEqualTo("WEB");
            assertThat(v.tags()).as("tags of %s", v.id()).isNotEmpty();
        }
    }

    @Test
    @DisplayName("Every entry text is <= 40 words (brief allows ~35; flex to 40 for foundational comfort verses like Isaiah 41:10)")
    void everyEntryTextWithinLimit() {
        for (CuratedVerse v : catalog.entries()) {
            int wordCount = v.text().trim().split("\\s+").length;
            assertThat(wordCount).as("word count of %s", v.id()).isLessThanOrEqualTo(40);
        }
    }

    @Test
    @DisplayName("Every entry tag is in known_tags; every excluded_context is either a known tag or a known category name")
    void everyTagInKnownEnum() {
        Set<String> known = catalog.knownTags();
        Set<String> categories = catalog.categoryTagMapping().keySet();
        for (CuratedVerse v : catalog.entries()) {
            for (String tag : v.tags()) {
                assertThat(known).as("unknown tag %s on %s", tag, v.id()).contains(tag);
            }
            if (v.excludedContexts() != null) {
                for (String ex : v.excludedContexts()) {
                    boolean isKnownTag = known.contains(ex);
                    boolean isKnownCategory = categories.contains(ex);
                    assertThat(isKnownTag || isKnownCategory)
                        .as("excluded_context '%s' on %s must be either a known tag or a known category name", ex, v.id())
                        .isTrue();
                }
            }
        }
    }

    @Test
    @DisplayName("All 9 categories have non-empty mapping; discussion is absent")
    void allNineCategoriesMapped() {
        assertThat(catalog.categoryTagMapping())
            .containsOnlyKeys("health", "mental-health", "family", "work", "grief",
                              "gratitude", "praise", "relationships", "other");
        for (var entry : catalog.categoryTagMapping().entrySet()) {
            assertThat(entry.getValue()).as("mapping for %s", entry.getKey()).isNotEmpty();
        }
    }

    @Test
    @DisplayName("Gate-G-NOT-HOPE: mental-health does NOT map to hope")
    void mentalHealthNotMappedToHope() {
        assertThat(catalog.categoryTagMapping().get("mental-health")).doesNotContain("hope");
    }

    @Test
    @DisplayName("Gate-G-NOT-HOPE: grief does NOT map to hope")
    void griefNotMappedToHope() {
        assertThat(catalog.categoryTagMapping().get("grief")).doesNotContain("hope");
    }
}
