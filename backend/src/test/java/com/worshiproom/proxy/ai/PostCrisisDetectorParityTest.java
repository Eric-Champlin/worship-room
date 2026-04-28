package com.worshiproom.proxy.ai;

import com.worshiproom.safety.PostCrisisDetector;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Asserts the four backend crisis-detector keyword lists are byte-for-byte
 * identical, AND that all four are supersets of the frontend source of truth.
 *
 * <p>Lives in {@code com.worshiproom.proxy.ai} test package for package-private
 * access to the three existing detectors' SELF_HARM_KEYWORDS constants.
 * {@link PostCrisisDetector} is public so cross-package access works.
 */
class PostCrisisDetectorParityTest {

    /** Hardcoded mirror of frontend SELF_HARM_KEYWORDS. Verified by control test. */
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
    void postDetector_matchesAskDetector() {
        assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS)
                .containsExactlyElementsOf(AskCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    void postDetector_matchesPrayerDetector() {
        assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS)
                .containsExactlyElementsOf(PrayerCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    void postDetector_matchesJournalDetector() {
        assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS)
                .containsExactlyElementsOf(JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    void postDetector_isSupersetOfFrontend() {
        assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS)
                .containsAll(FRONTEND_KEYWORDS);
    }
}
