package com.worshiproom.verse;

/**
 * The three trigger surfaces that may request a verse (Spec 6.8 §"Trigger surfaces").
 * The query-param wire form is lowercase snake_case to match Spec 6.8's public OpenAPI.
 */
public enum TriggerType {
    POST_COMPOSE("post_compose"),
    COMMENT("comment"),
    READING_TIME("reading_time");

    private final String dbValue;

    TriggerType(String dbValue) {
        this.dbValue = dbValue;
    }

    /** Wire/DB string form (matches the {@code trigger_type} CHECK constraint). */
    public String dbValue() {
        return dbValue;
    }

    /**
     * @throws IllegalArgumentException for null or unknown wire values; the controller
     *         catches this and re-throws as {@code InvalidTriggerException} (400).
     */
    public static TriggerType fromQueryParam(String s) {
        if (s == null) throw new IllegalArgumentException("trigger required");
        return switch (s) {
            case "post_compose" -> POST_COMPOSE;
            case "comment" -> COMMENT;
            case "reading_time" -> READING_TIME;
            default -> throw new IllegalArgumentException("unknown trigger: " + s);
        };
    }
}
