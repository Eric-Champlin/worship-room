package com.worshiproom.social;

/**
 * Wire values match the {@code social_interactions.interaction_type} CHECK
 * constraint from Liquibase changeset 2026-04-27-011: {@code 'encouragement',
 * 'nudge', 'recap_dismissal'}.
 */
public enum SocialInteractionType {
    ENCOURAGEMENT("encouragement"),
    NUDGE("nudge"),
    RECAP_DISMISSAL("recap_dismissal");

    private final String value;

    SocialInteractionType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static SocialInteractionType fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("SocialInteractionType value must not be null");
        }
        for (SocialInteractionType s : values()) {
            if (s.value.equals(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown SocialInteractionType value: " + value);
    }
}
