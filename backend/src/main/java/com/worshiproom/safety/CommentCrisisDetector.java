package com.worshiproom.safety;

import java.util.List;
import java.util.Locale;

/**
 * Mirror of {@link PostCrisisDetector} for prayer-wall comments. Same 12 keywords,
 * same case-insensitive substring match. Drift between this and PostCrisisDetector
 * is structurally impossible (the keyword constant is shared) AND asserted by
 * {@code CommentCrisisDetectorParityTest} as a regression guard if a future
 * refactor decouples the lists.
 *
 * <p>Followup #15 covers the LLM-classifier upgrade for both detectors. Until then,
 * keyword-only is sufficient for MVP given the failure mode is fail-closed UI
 * (resources surfaced) and Sentry alert (admin notification).
 */
public final class CommentCrisisDetector {

    /** Shared with {@link PostCrisisDetector} — drift is structurally impossible. */
    public static final List<String> SELF_HARM_KEYWORDS = PostCrisisDetector.SELF_HARM_KEYWORDS;

    private CommentCrisisDetector() {}

    public static boolean detectsCrisis(String text) {
        if (text == null || text.isBlank()) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String keyword : SELF_HARM_KEYWORDS) {
            if (lower.contains(keyword)) return true;
        }
        return false;
    }
}
