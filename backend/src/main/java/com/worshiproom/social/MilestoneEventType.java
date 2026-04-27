package com.worshiproom.social;

/**
 * Wire values match the {@code milestone_events.event_type} CHECK constraint
 * from Liquibase changeset 2026-04-27-012: {@code 'streak_milestone',
 * 'level_up', 'badge_earned', 'prayer_count_milestone', 'friend_milestone'}.
 *
 * <p>{@code PRAYER_COUNT_MILESTONE} is declared (the DB CHECK requires the
 * value) but no emission logic ships in Spec 2.5.4b — a future spec adds
 * emission when prayer-count thresholds become canonical.
 */
public enum MilestoneEventType {
    STREAK_MILESTONE("streak_milestone"),
    LEVEL_UP("level_up"),
    BADGE_EARNED("badge_earned"),
    PRAYER_COUNT_MILESTONE("prayer_count_milestone"),
    FRIEND_MILESTONE("friend_milestone");

    private final String value;

    MilestoneEventType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static MilestoneEventType fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("MilestoneEventType value must not be null");
        }
        for (MilestoneEventType m : values()) {
            if (m.value.equals(value)) {
                return m;
            }
        }
        throw new IllegalArgumentException("Unknown MilestoneEventType value: " + value);
    }
}
