package com.worshiproom.activity.dto;

import java.util.List;

/**
 * Output of {@link com.worshiproom.activity.BadgeService#checkBadges}.
 *
 * <p>The two fields are parallel arrays. Iterate in lockstep:
 * {@code newlyEarnedBadgeIds.get(i)} and
 * {@code newlyEarnedDefinitions.get(i)} describe the same badge.
 *
 * <p>Order reflects the 15-category iteration order from the frontend
 * {@code checkForNewBadges}. Repeatable badges (currently only
 * {@code full_worship_day}) are included on every call where the
 * eligibility condition holds, regardless of {@code alreadyEarnedBadgeIds}.
 *
 * @param newlyEarnedBadgeIds      stable badge IDs that fired this call
 * @param newlyEarnedDefinitions   full metadata for each ID, parallel-indexed
 */
public record BadgeResult(
    List<String> newlyEarnedBadgeIds,
    List<BadgeDefinition> newlyEarnedDefinitions
) {}
