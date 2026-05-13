package com.worshiproom.post.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Spec 6.5 — a single entry in the Intercessor Timeline.
 *
 * <p>Gate-G-ANONYMOUS-PRIVACY (HARD): when {@code isAnonymous} is true, the
 * {@code userId} field is NEVER present in the JSON output. Achieved via:
 * <ol>
 *   <li>{@code @JsonInclude(JsonInclude.Include.NON_NULL)} at field level so null
 *       userId disappears from the wire.</li>
 *   <li>Factory methods {@link #named(UUID, String, OffsetDateTime)} and
 *       {@link #anonymous(OffsetDateTime)} that enforce the invariant —
 *       anonymous entries always have userId = null, named entries always have
 *       userId != null.</li>
 *   <li>{@link #of(UUID, String, boolean, OffsetDateTime)} guards the contract
 *       at construction time and throws on mismatched (isAnonymous=true, userId
 *       != null) combinations.</li>
 * </ol>
 *
 * <p>The {@code displayName} for anonymous entries is the literal string
 * {@code "Anonymous"} (Copy Deck constant; mirrored client-side).
 *
 * <p>Sort guarantee: server returns entries sorted by reactedAt DESC, tiebroken
 * by userId ASC. Frontend renders in array order.
 */
public record IntercessorEntry(
        @JsonInclude(JsonInclude.Include.NON_NULL) UUID userId,
        String displayName,
        boolean isAnonymous,
        OffsetDateTime reactedAt
) {
    /** Construct a named entry. Throws IllegalArgumentException if userId is null. */
    public static IntercessorEntry named(UUID userId, String displayName, OffsetDateTime reactedAt) {
        if (userId == null) {
            throw new IllegalArgumentException("named entry requires non-null userId");
        }
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("named entry requires non-blank displayName");
        }
        return new IntercessorEntry(userId, displayName, false, reactedAt);
    }

    /** Construct an anonymous entry. userId is omitted from the wire. */
    public static IntercessorEntry anonymous(OffsetDateTime reactedAt) {
        return new IntercessorEntry(null, "Anonymous", true, reactedAt);
    }

    /**
     * Defensive factory. Throws if (isAnonymous=true, userId != null) — that
     * combination violates Gate-G-ANONYMOUS-PRIVACY and would put a userId
     * on the wire for an anonymous entry.
     */
    public static IntercessorEntry of(UUID userId, String displayName, boolean isAnonymous, OffsetDateTime reactedAt) {
        if (isAnonymous && userId != null) {
            throw new IllegalArgumentException(
                    "Gate-G-ANONYMOUS-PRIVACY: anonymous entry must have null userId");
        }
        if (!isAnonymous && userId == null) {
            throw new IllegalArgumentException("named entry must have non-null userId");
        }
        return new IntercessorEntry(userId, displayName, isAnonymous, reactedAt);
    }
}
