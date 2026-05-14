package com.worshiproom.safety;

import java.util.UUID;

/**
 * Single read-side gate for the 48-hour crisis-flag suppression in Verse-Finds-You (Spec 6.8).
 *
 * <p>This interface is the ONE wiring point Phase 10 (10.5 routing + 10.6 automated flagging)
 * will replace when the broader crisis-detection pipeline ships. Until then, the pre-Phase-10
 * implementation in {@link PrePhase10CrisisFlagGate} reads from the existing per-post
 * {@code Post.crisis_flag} column populated by {@link PostCrisisDetector}.
 *
 * <p>The brief at {@code _specs/forums/spec-6-8.md} §0 (Runtime-Gated Dependency Reality)
 * documents the deliberate dormancy: pre-Phase-10 this gate's broadest reading is "user has
 * at least one crisis-flagged post in the last 48h" — narrower than the full Phase 10 signal,
 * but exercised in production from day one (not deferred).
 *
 * <p><b>Phase 10 replacement contract:</b> any implementation MUST return {@code true} if the
 * user has triggered crisis-flag detection by any means (post body, comment body, behavioral
 * signals) in the last 48 hours, and {@code false} otherwise. Returning {@code false} when the
 * underlying signal is unavailable (e.g., a future signal source is offline) is acceptable —
 * the cooldown gate (Step 2 of the selection algorithm) provides defense in depth.
 */
public interface CrisisFlagGate {
    /**
     * @param userId the user whose surfacing eligibility is being evaluated; never null
     * @return {@code true} if the user is currently within a 48-hour crisis-flag suppression
     *         window; {@code false} if not (or if no signal can be read).
     */
    boolean isUserCrisisFlagged(UUID userId);
}
