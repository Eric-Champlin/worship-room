package com.worshiproom.verse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Spec 6.8 — VerseSelectionEngine unit tests. Covers spec test items
 * T1, T2, T3, T4, T5, T6, T18.
 *
 * <p>Isolated from {@link VerseCatalog}'s real JSON parse via Mockito so
 * synthetic curation can be supplied without touching {@code verse-finds-you.json}
 * (which legitimately ships empty until Eric's curation lands per
 * Gate-G-CURATION-PREREQ).
 */
@ExtendWith(MockitoExtension.class)
class VerseSelectionEngineTest {

    @Mock private VerseCatalog catalog;
    @InjectMocks private VerseSelectionEngine engine;

    private static final UUID USER_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID USER_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private CuratedVerse v1;
    private CuratedVerse v2;
    private CuratedVerse v3;

    @BeforeEach
    void seedSyntheticCatalog() {
        // Three synthetic grief/lament/comfort verses. NOT real scripture text —
        // engine logic is translation-agnostic and these are filler that satisfy
        // the schema only.
        v1 = new CuratedVerse("synthetic-1", "Test 1:1", "First synthetic.", "WEB",
            Set.of("comfort"), Set.of(), 2);
        v2 = new CuratedVerse("synthetic-2", "Test 2:2", "Second synthetic.", "WEB",
            Set.of("lament", "presence"), Set.of(), 2);
        // v3 is tagged "comfort,presence" but excludes any context whose
        // resolved tag set contains "lament". The grief mapping resolves to
        // {lament, presence, comfort} — "lament" is in the set, so v3 is
        // filtered out when category=grief. This matches the plan's intent:
        // excluded_contexts entries are TAG NAMES, not category names; the
        // filter matches against the resolved context tag set.
        v3 = new CuratedVerse("synthetic-3", "Test 3:3", "Third synthetic.", "WEB",
            Set.of("comfort", "presence"), Set.of("lament"), 2);
    }

    @Test
    @DisplayName("T1: identical inputs (user, category, day) → same verse")
    void determinismIdenticalInputs() {
        when(catalog.categoryTagMapping()).thenReturn(Map.of("mental-health", List.of("comfort", "lament", "presence", "rest")));
        when(catalog.entries()).thenReturn(List.of(v1, v2, v3));

        Optional<CuratedVerse> a = engine.select(USER_A, "mental-health", 100);
        Optional<CuratedVerse> b = engine.select(USER_A, "mental-health", 100);

        assertThat(a).isPresent();
        assertThat(b).isPresent();
        assertThat(a.get().id()).isEqualTo(b.get().id());
    }

    @Test
    @DisplayName("T2: two different users on the same day with the same context → may differ but each is stable")
    void determinismPerUser() {
        when(catalog.categoryTagMapping()).thenReturn(Map.of("mental-health", List.of("comfort", "lament", "presence", "rest")));
        when(catalog.entries()).thenReturn(List.of(v1, v2, v3));

        Optional<CuratedVerse> userA = engine.select(USER_A, "mental-health", 100);
        Optional<CuratedVerse> userB = engine.select(USER_B, "mental-health", 100);
        assertThat(userA).isPresent();
        assertThat(userB).isPresent();
        // Each user's selection is stable (same ID across calls); the brief allows
        // user-A and user-B to surface either the same or different verse — the
        // determinism property is per-user, not cross-user uniqueness.
        assertThat(engine.select(USER_A, "mental-health", 100).get().id()).isEqualTo(userA.get().id());
        assertThat(engine.select(USER_B, "mental-health", 100).get().id()).isEqualTo(userB.get().id());
    }

    @Test
    @DisplayName("T3: day boundary crossed → verse selection rotates")
    void dayBoundaryRotates() {
        when(catalog.categoryTagMapping()).thenReturn(Map.of("mental-health", List.of("comfort", "lament", "presence", "rest")));
        when(catalog.entries()).thenReturn(List.of(v1, v2, v3));

        // Find a day pair that produces different selections (deterministic search,
        // bounded iteration). With 3 entries, at least 2 of any 3 consecutive days
        // must differ since size-3 modulo guarantees coverage.
        Optional<CuratedVerse> day100 = engine.select(USER_A, "mental-health", 100);
        Optional<CuratedVerse> day101 = engine.select(USER_A, "mental-health", 101);
        Optional<CuratedVerse> day102 = engine.select(USER_A, "mental-health", 102);
        // At least one of (100,101) or (101,102) or (100,102) must differ.
        boolean anyDiffer =
            !day100.get().id().equals(day101.get().id())
                || !day101.get().id().equals(day102.get().id())
                || !day100.get().id().equals(day102.get().id());
        assertThat(anyDiffer).isTrue();
    }

    @Test
    @DisplayName("T4: refresh on the same day → same verse (no slot-machine retry)")
    void refreshSameDayStable() {
        when(catalog.categoryTagMapping()).thenReturn(Map.of("mental-health", List.of("comfort", "lament", "presence", "rest")));
        when(catalog.entries()).thenReturn(List.of(v1, v2, v3));

        Optional<CuratedVerse> first = engine.select(USER_A, "mental-health", 200);
        for (int i = 0; i < 10; i++) {
            assertThat(engine.select(USER_A, "mental-health", 200).get().id())
                .isEqualTo(first.get().id());
        }
    }

    @Test
    @DisplayName("T5: excluded_contexts filters a verse OUT when its excluded tag is in the context set")
    void excludedContextsFilters() {
        // grief context tags: {lament, presence, comfort}
        // v3 has tags=[comfort,presence] and excluded_contexts=[grief]
        // → v3 must be filtered out when category=grief
        when(catalog.categoryTagMapping()).thenReturn(Map.of("grief", List.of("lament", "presence", "comfort")));
        when(catalog.entries()).thenReturn(List.of(v3));  // only v3 in the catalog

        Optional<CuratedVerse> result = engine.select(USER_A, "grief", 50);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("T6: empty filtered set → Optional.empty (no_match)")
    void emptyFilteredReturnsEmpty() {
        when(catalog.categoryTagMapping()).thenReturn(Map.of("praise", List.of("praise", "joy", "thanksgiving")));
        when(catalog.entries()).thenReturn(List.of(v1, v2, v3));  // none tagged praise/joy/thanksgiving

        Optional<CuratedVerse> result = engine.select(USER_A, "praise", 100);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("T18: empty / unknown category → no_match (Step 4 of selection algorithm)")
    void unknownCategoryReturnsEmpty() {
        when(catalog.categoryTagMapping()).thenReturn(Map.of("grief", List.of("lament")));

        // null
        assertThat(engine.select(USER_A, null)).isEmpty();
        // blank
        assertThat(engine.select(USER_A, "")).isEmpty();
        // unknown
        assertThat(engine.select(USER_A, "discussion")).isEmpty();
    }

    @Test
    @DisplayName("Discussion category absent from mapping → no_match (plan Edge Case decision)")
    void discussionExplicitlyAbsentReturnsEmpty() {
        when(catalog.categoryTagMapping()).thenReturn(Map.of(
            "grief", List.of("lament"),
            "mental-health", List.of("comfort")
            // discussion intentionally absent
        ));

        assertThat(engine.select(USER_A, "discussion")).isEmpty();
    }
}
