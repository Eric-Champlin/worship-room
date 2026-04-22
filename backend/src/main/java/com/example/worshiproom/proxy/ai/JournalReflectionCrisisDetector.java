package com.example.worshiproom.proxy.ai;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection for journal reflections.
 * Defense-in-depth against the client-side {@code containsCrisisKeyword} in
 * {@code frontend/src/constants/crisis-resources.ts}.
 *
 * Journal entries are the most concentrated emotional content in the app
 * (5000 char cap), and the client-side CrisisBanner only renders inside
 * JournalInput while writing — once the entry is saved and the user clicks
 * "Reflect", the only crisis gate left is this backend check. That makes
 * the server-side detection especially important for this endpoint.
 *
 * The keyword list is INTENTIONALLY DUPLICATED from {@link AskCrisisDetector}
 * and {@link PrayerCrisisDetector} (see spec AD #5). Parity tests in
 * {@code JournalReflectionCrisisDetectorTest} assert the three backend lists
 * stay equal; all three must be supersets of the frontend source of truth.
 *
 * If any keyword matches (case-insensitive substring), the service returns a
 * canned crisis reflection without calling Gemini.
 */
final class JournalReflectionCrisisDetector {

    private JournalReflectionCrisisDetector() {}

    /** MUST match AskCrisisDetector.SELF_HARM_KEYWORDS AND PrayerCrisisDetector.SELF_HARM_KEYWORDS exactly. Verified by tests. */
    static final List<String> SELF_HARM_KEYWORDS = List.of(
        // Parity with frontend
        "suicide",
        "kill myself",
        "end it all",
        "not worth living",
        "hurt myself",
        "end my life",
        "want to die",
        "better off dead",
        // Backend-only additions (also in AskCrisisDetector and PrayerCrisisDetector)
        "take my own life",
        "don't want to be here",
        "nobody would miss me",
        "cease to exist"
    );

    static boolean detectsCrisis(String text) {
        if (text == null || text.isBlank()) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String keyword : SELF_HARM_KEYWORDS) {
            if (lower.contains(keyword)) return true;
        }
        return false;
    }

    static JournalReflectionResponseDto buildCrisisResponse() {
        return new JournalReflectionResponseDto(
            "crisis",
            "What you wrote here matters, and thank you for trusting this page with it. You don't have to carry this alone right now — please reach out tonight. Call 988 (Suicide and Crisis Lifeline) or text HOME to 741741 for the Crisis Text Line. Both are free, confidential, and available 24/7, and talking to a real person who can sit with you is exactly what this moment calls for. You deserve support beyond a page."
        );
    }
}
