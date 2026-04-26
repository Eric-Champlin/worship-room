package com.worshiproom.activity.constants;

import com.worshiproom.activity.MultiplierTier;
import java.util.List;

/**
 * Multiplier tiers applied to a day's base points based on activity count.
 * Verbatim port of {@code frontend/src/constants/dashboard/activity-points.ts MULTIPLIER_TIERS}.
 *
 * <p>Order is highest-first: the engine short-circuits on the first match,
 * so 7+ activities beats 4+ which beats 2+ which beats 0+. The base tier's
 * label is the empty string — preserve it verbatim, do not substitute "None".
 */
public final class MultiplierTiers {

    public record TierThreshold(int minActivities, MultiplierTier tier) {}

    public static final List<TierThreshold> TIERS = List.of(
        new TierThreshold(7, new MultiplierTier("Full Worship Day", 2.0)),
        new TierThreshold(4, new MultiplierTier("Devoted",          1.5)),
        new TierThreshold(2, new MultiplierTier("Growing",          1.25)),
        new TierThreshold(0, new MultiplierTier("",                 1.0))
    );

    /**
     * Returns the matching tier for the given activity count.
     * Mirrors the frontend's break-on-first-match loop semantics.
     */
    public static MultiplierTier forActivityCount(int activityCount) {
        for (TierThreshold t : TIERS) {
            if (activityCount >= t.minActivities()) {
                return t.tier();
            }
        }
        return TIERS.get(TIERS.size() - 1).tier();
    }

    private MultiplierTiers() {}
}
