package com.worshiproom.safety;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CommentCrisisDetectorTest {

    @Test
    void detectsCrisis_nullInput_returnsFalse() {
        assertThat(CommentCrisisDetector.detectsCrisis(null)).isFalse();
    }

    @Test
    void detectsCrisis_emptyString_returnsFalse() {
        assertThat(CommentCrisisDetector.detectsCrisis("")).isFalse();
    }

    @Test
    void detectsCrisis_whitespaceOnly_returnsFalse() {
        assertThat(CommentCrisisDetector.detectsCrisis("   \n\t ")).isFalse();
    }

    @Test
    void detectsCrisis_eachKeywordTriggers() {
        for (String keyword : CommentCrisisDetector.SELF_HARM_KEYWORDS) {
            assertThat(CommentCrisisDetector.detectsCrisis(keyword))
                    .as("keyword '%s' must trigger detection", keyword)
                    .isTrue();
        }
    }

    @Test
    void detectsCrisis_caseInsensitive() {
        assertThat(CommentCrisisDetector.detectsCrisis("SUICIDE")).isTrue();
        assertThat(CommentCrisisDetector.detectsCrisis("Suicide")).isTrue();
        assertThat(CommentCrisisDetector.detectsCrisis("sUiCiDe")).isTrue();
        assertThat(CommentCrisisDetector.detectsCrisis("Kill MYSELF")).isTrue();
    }

    @Test
    void detectsCrisis_keywordEmbeddedInLargerText() {
        assertThat(CommentCrisisDetector.detectsCrisis(
                "I've been there too — sometimes I think about suicide and it scares me."
        )).isTrue();
    }

    @Test
    void detectsCrisis_normalContent_returnsFalse() {
        assertThat(CommentCrisisDetector.detectsCrisis(
                "Praying for your mom's surgery — God's got her."
        )).isFalse();
        assertThat(CommentCrisisDetector.detectsCrisis(
                "I'm dying to share this verse with you — it's been on my heart."
        )).isFalse();  // "die" alone is NOT a keyword; "want to die" is.
    }

    @Test
    void detectsCrisis_keywordList_hasExactly12Entries() {
        // Anchors the keyword list size; if a keyword is added, the parity
        // tests in CommentCrisisDetectorParityTest must also be updated.
        assertThat(CommentCrisisDetector.SELF_HARM_KEYWORDS).hasSize(12);
    }
}
