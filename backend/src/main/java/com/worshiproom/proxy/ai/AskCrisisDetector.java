package com.worshiproom.proxy.ai;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection. Defense-in-depth against the client-side
 * {@code containsCrisisKeyword} in {@code frontend/src/constants/crisis-resources.ts}.
 * Source of truth is the frontend list; this list is a superset copy.
 *
 * If any keyword matches (case-insensitive substring), the service returns a canned
 * crisis response without calling Gemini.
 */
final class AskCrisisDetector {

    private AskCrisisDetector() {}

    /** MUST include all entries from frontend SELF_HARM_KEYWORDS; may include more. */
    static final List<String> SELF_HARM_KEYWORDS = List.of(
        // Parity with frontend (verified by AskCrisisDetectorTest.parityWithFrontend)
        "suicide",
        "kill myself",
        "end it all",
        "not worth living",
        "hurt myself",
        "end my life",
        "want to die",
        "better off dead",
        // Backend-only additions — broader coverage
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

    static AskResponseDto buildCrisisResponse() {
        return new AskResponseDto(
            "crisis",
            "Help is available",
            "I hear how much pain you're in, and I'm so glad you reached out. Please know you're not alone, and there are people ready to listen right now — not to judge, not to rush you, just to be with you in this.\n\nIf you're in crisis, please call or text 988 (the Suicide & Crisis Lifeline) — it's free, confidential, and available 24/7. You can also text HOME to 741741 to reach the Crisis Text Line. These aren't last resorts. They're exactly what they exist for — moments like this.\n\nScripture doesn't shy away from the darkest places. Psalm 34:18 promises that God is near to the broken-hearted. Your pain matters. Your life matters. Please reach out tonight.",
            List.of(
                new AskVerseDto(
                    "Psalm 34:18",
                    "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.",
                    "When you feel most alone, God draws closest — not from a distance, but right into the brokenness with you."
                ),
                new AskVerseDto(
                    "Psalm 147:3",
                    "He heals the broken in heart, and binds up their wounds.",
                    "God's healing isn't metaphorical — he tends to the deepest wounds, one at a time."
                ),
                new AskVerseDto(
                    "Matthew 11:28",
                    "Come to me, all you who labor and are heavily burdened, and I will give you rest.",
                    "Jesus invites you exactly as you are — exhausted, burdened, unable to carry more. You don't have to fix yourself first."
                )
            ),
            "You are seen. You are loved. Please reach out — 988 or text HOME to 741741.",
            "Lord, I'm struggling and I don't know how to keep going. I'm scared, and I'm tired. Please meet me here. Send me the right person to talk to. Remind me that my life matters to you. Help me take the next step, even if it's just one phone call. Amen.",
            List.of(
                "What if I'm afraid to call 988?",
                "How do I find a counselor near me?",
                "Is it okay to feel this way as a Christian?"
            )
        );
    }
}
