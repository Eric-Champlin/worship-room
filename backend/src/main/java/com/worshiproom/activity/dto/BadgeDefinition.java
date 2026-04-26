package com.worshiproom.activity.dto;

import com.worshiproom.activity.CelebrationTier;
import java.util.Optional;

/**
 * Catalog entry for a single badge. Verbatim port of frontend
 * {@code BadgeDefinition} (frontend/src/types/dashboard.ts).
 *
 * <p>The frontend {@code repeatable?} optional flag becomes a non-null
 * boolean here (default {@code false}). The frontend {@code verse?}
 * optional becomes {@code Optional<BadgeVerse>}.
 *
 * @param id              stable badge identifier (e.g., "streak_7", "full_worship_day")
 * @param name            short display name (e.g., "First Flame")
 * @param description     longer explanation surfaced in celebrations
 * @param category        one of 12 valid category strings (see frontend BadgeCategory)
 * @param celebrationTier UI celebration treatment
 * @param repeatable      true ONLY for {@code full_worship_day} in the current catalog
 * @param verse           optional scripture verse (present on 9 badges)
 */
public record BadgeDefinition(
    String id,
    String name,
    String description,
    String category,
    CelebrationTier celebrationTier,
    boolean repeatable,
    Optional<BadgeVerse> verse
) {}
