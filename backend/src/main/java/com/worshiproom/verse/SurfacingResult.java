package com.worshiproom.verse;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Result of a {@link VerseFindsYouService#surface} call. Either a verse with no
 * reason, or no verse with one of the four {@link SurfacingReason} codes.
 */
public record SurfacingResult(
    Optional<CuratedVerse> verse,
    OffsetDateTime cooldownUntil,
    SurfacingReason reason
) {
    public static SurfacingResult success(CuratedVerse v) {
        return new SurfacingResult(Optional.of(v), null, null);
    }

    public static SurfacingResult cooldown(OffsetDateTime until) {
        return new SurfacingResult(Optional.empty(), until, SurfacingReason.COOLDOWN);
    }

    public static SurfacingResult crisis() {
        return new SurfacingResult(Optional.empty(), null, SurfacingReason.CRISIS_SUPPRESSION);
    }

    public static SurfacingResult disabled() {
        return new SurfacingResult(Optional.empty(), null, SurfacingReason.DISABLED);
    }

    public static SurfacingResult noMatch() {
        return new SurfacingResult(Optional.empty(), null, SurfacingReason.NO_MATCH);
    }
}
