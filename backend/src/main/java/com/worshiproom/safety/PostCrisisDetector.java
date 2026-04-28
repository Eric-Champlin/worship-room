package com.worshiproom.safety;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection for prayer wall posts. Defense-in-depth
 * against the client-side {@code containsCrisisKeyword} in
 * {@code frontend/src/constants/crisis-resources.ts}.
 *
 * <p>The keyword list is INTENTIONALLY DUPLICATED from
 * {@link com.worshiproom.proxy.ai.AskCrisisDetector},
 * {@link com.worshiproom.proxy.ai.PrayerCrisisDetector}, and
 * {@link com.worshiproom.proxy.ai.JournalReflectionCrisisDetector}.
 * {@code PostCrisisDetectorParityTest} (in {@code com.worshiproom.proxy.ai} test
 * package for package-private access) asserts all four backend lists stay equal
 * AND remain supersets of the frontend source of truth.
 *
 * <p>If any keyword matches (case-insensitive substring), {@code detectsCrisis}
 * returns true. The caller (PostService) sets {@code posts.crisis_flag = TRUE}
 * and emits a {@link CrisisDetectedEvent} for AFTER_COMMIT processing.
 *
 * <p>This class is {@code public} (unlike the three existing detectors which are
 * package-private) because it is consumed from {@code com.worshiproom.post}.
 */
public final class PostCrisisDetector {

    private PostCrisisDetector() {}

    /** MUST match the other three detectors exactly. Verified by parity tests. */
    public static final List<String> SELF_HARM_KEYWORDS = List.of(
            // Parity with frontend
            "suicide",
            "kill myself",
            "end it all",
            "not worth living",
            "hurt myself",
            "end my life",
            "want to die",
            "better off dead",
            // Backend-only additions (also in the three existing detectors)
            "take my own life",
            "don't want to be here",
            "nobody would miss me",
            "cease to exist"
    );

    public static boolean detectsCrisis(String text) {
        if (text == null || text.isBlank()) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String keyword : SELF_HARM_KEYWORDS) {
            if (lower.contains(keyword)) return true;
        }
        return false;
    }
}
