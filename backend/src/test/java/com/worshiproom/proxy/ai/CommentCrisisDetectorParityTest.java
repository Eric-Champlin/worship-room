package com.worshiproom.proxy.ai;

import com.worshiproom.safety.CommentCrisisDetector;
import com.worshiproom.safety.PostCrisisDetector;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Asserts CommentCrisisDetector's keyword list stays in lock-step with the four
 * sibling backend detectors and the frontend source of truth. The constant is
 * already shared structurally ({@code CommentCrisisDetector.SELF_HARM_KEYWORDS =
 * PostCrisisDetector.SELF_HARM_KEYWORDS}); these tests are a regression guard
 * against a future refactor that decouples the lists, AND a detection-consistency
 * sample to verify the same input string produces identical boolean results from
 * both detectors.
 *
 * <p>Lives in {@code com.worshiproom.proxy.ai} test package for package-private
 * access to {@link AskCrisisDetector}, {@link PrayerCrisisDetector}, and
 * {@link JournalReflectionCrisisDetector}.
 */
class CommentCrisisDetectorParityTest {

    /** Hardcoded mirror of frontend SELF_HARM_KEYWORDS. */
    private static final List<String> FRONTEND_KEYWORDS = List.of(
            "suicide",
            "kill myself",
            "end it all",
            "not worth living",
            "hurt myself",
            "end my life",
            "want to die",
            "better off dead"
    );

    @Test
    void commentDetector_matchesPostDetector() {
        assertThat(CommentCrisisDetector.SELF_HARM_KEYWORDS)
                .containsExactlyElementsOf(PostCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    void commentDetector_matchesAskDetector() {
        assertThat(CommentCrisisDetector.SELF_HARM_KEYWORDS)
                .containsExactlyElementsOf(AskCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    void commentDetector_matchesPrayerDetector() {
        assertThat(CommentCrisisDetector.SELF_HARM_KEYWORDS)
                .containsExactlyElementsOf(PrayerCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    void commentDetector_matchesJournalDetector() {
        assertThat(CommentCrisisDetector.SELF_HARM_KEYWORDS)
                .containsExactlyElementsOf(JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    void commentDetector_isSupersetOfFrontend() {
        assertThat(CommentCrisisDetector.SELF_HARM_KEYWORDS)
                .containsAll(FRONTEND_KEYWORDS);
    }

    @Test
    void commentDetector_detectsCrisisAgreesWithPostDetectorAcrossSampleInputs() {
        // Detection-consistency sample: 20 representative inputs, mix of crisis
        // keywords, near-misses, and clean text. Both detectors must produce
        // identical boolean results — drift here means one detector's keyword
        // logic diverged even though their lists matched.
        List<String> samples = List.of(
                // Crisis keyword exact matches (8)
                "i think about suicide",
                "I want to kill myself",
                "I want to end it all",
                "feel like life is not worth living",
                "I might hurt myself",
                "going to end my life",
                "I want to die soon",
                "I'd be better off dead",
                // Backend-only keyword matches (4)
                "I might take my own life tonight",
                "I don't want to be here anymore",
                "honestly nobody would miss me",
                "I just want to cease to exist",
                // Near-misses (clean) (8)
                "Please pray for me",
                "I'm dying to see her again",
                "I killed it on the test today",
                "this hurt me deeply",
                "the end of an era",
                "my dog died last year",
                "feeling a bit dead inside but I'll be okay",
                "thank you for your prayers"
        );

        for (String input : samples) {
            boolean post = PostCrisisDetector.detectsCrisis(input);
            boolean comment = CommentCrisisDetector.detectsCrisis(input);
            assertThat(comment)
                    .as("input '%s' must produce same detection result on both detectors", input)
                    .isEqualTo(post);
        }
    }
}
