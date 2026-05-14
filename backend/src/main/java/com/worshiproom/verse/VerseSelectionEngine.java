package com.worshiproom.verse;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * The 7-step deterministic selection algorithm for Spec 6.8.
 *
 * <p>Step 1 (crisis-flag) and Step 2 (cooldown) and Step 3 (disabled) live in
 * {@link VerseFindsYouService} — gating logic that returns null with a reason
 * code before the engine is even called.
 *
 * <p>This engine handles steps 4–7: tag derivation from category context,
 * filtering, deterministic selection.
 */
@Component
public class VerseSelectionEngine {

    private final VerseCatalog catalog;

    public VerseSelectionEngine(VerseCatalog catalog) {
        this.catalog = catalog;
    }

    /**
     * @param userId  caller user id (used in deterministic hash)
     * @param category the post category (e.g. "grief", "mental-health"); may be null
     * @return Optional.empty() if no verse matches the context; populated otherwise.
     */
    public Optional<CuratedVerse> select(UUID userId, String category) {
        return select(userId, category, LocalDate.now(ZoneOffset.UTC).getDayOfYear());
    }

    /**
     * Test seam: identical to {@link #select(UUID, String)} but day-of-year
     * is injected so day-boundary tests are deterministic.
     */
    public Optional<CuratedVerse> select(UUID userId, String category, int dayOfYear) {
        if (category == null || category.isBlank()) return Optional.empty();
        List<String> contextTags = catalog.categoryTagMapping().get(category);
        // Step 4 — no mapping → no_match
        if (contextTags == null || contextTags.isEmpty()) return Optional.empty();

        Set<String> contextSet = new HashSet<>(contextTags);

        // Step 5 — filter to entries matching ANY context tag AND NOT in excluded_contexts.
        // excluded_contexts entries may be EITHER tag names (matched against the resolved
        // contextSet) OR category names (matched against the active category). Eric's
        // 2026-05-14 curation uses category names (e.g. "grief", "mental-health") as
        // excluded_contexts so the pastoral intent "this verse should not surface in the
        // grief category" works directly. Both forms are honored — defense in depth.
        List<CuratedVerse> filtered = catalog.entries().stream()
            .filter(v -> v.tags() != null && v.tags().stream().anyMatch(contextSet::contains))
            .filter(v -> v.excludedContexts() == null
                || v.excludedContexts().stream().noneMatch(
                    ex -> contextSet.contains(ex) || ex.equals(category)))
            .toList();

        if (filtered.isEmpty()) return Optional.empty();

        // Step 6 — deterministic selection: (Math.abs(userId.toString().hashCode()) + dayOfYear) % size
        // String.hashCode() is specified stable across JVMs (Javadoc contract), unlike
        // UUID.hashCode() which mixes timestamp bits. Math.abs handles Integer.MIN_VALUE
        // edge case explicitly via the (hashComponent < 0 ? Integer.MAX_VALUE : hashComponent)
        // dance that Math.abs effectively performs (Math.abs returns MIN_VALUE for MIN_VALUE).
        int rawHash = userId.toString().hashCode();
        int hashComponent = rawHash == Integer.MIN_VALUE ? Integer.MAX_VALUE : Math.abs(rawHash);
        int index = (hashComponent + dayOfYear) % filtered.size();

        // Step 7 — return
        return Optional.of(filtered.get(index));
    }
}
