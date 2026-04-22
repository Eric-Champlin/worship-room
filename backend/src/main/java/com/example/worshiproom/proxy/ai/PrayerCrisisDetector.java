package com.example.worshiproom.proxy.ai;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection for prayer requests. Defense-in-depth
 * against the client-side {@code containsCrisisKeyword} in
 * {@code frontend/src/constants/crisis-resources.ts}.
 *
 * The keyword list is INTENTIONALLY DUPLICATED from {@link AskCrisisDetector}
 * (see AI-2 spec AD #5). {@code PrayerCrisisDetectorTest.parityWithAskDetector}
 * asserts the two backend lists stay equal; both must be supersets of the
 * frontend source of truth.
 *
 * If any keyword matches (case-insensitive substring), the service returns a
 * canned crisis prayer without calling Gemini.
 */
final class PrayerCrisisDetector {

    private PrayerCrisisDetector() {}

    /** MUST match AskCrisisDetector.SELF_HARM_KEYWORDS exactly. Verified by test. */
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
        // Backend-only additions (also in AskCrisisDetector)
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

    static PrayerResponseDto buildCrisisResponse() {
        return new PrayerResponseDto(
            "crisis",
            "crisis",
            "Dear God, I come to You carrying a weight that feels unbearable. You see every tear, every fear, every moment when hope feels far away. Right now, I need You, and I need people who can be Your hands and voice for me tonight. Please give me the courage to reach out. Help me to call 988, the Suicide and Crisis Lifeline, where someone is waiting to listen without judgment. Help me to text HOME to 741741 if words are easier on a screen. Remind me that my life is precious to You, that I am not a burden, and that this pain — as real as it is — is not the whole of my story. Hold me close tonight. Send me the right person to talk to. Be the peace that guards my heart until morning. Amen."
        );
    }
}
