package com.worshiproom.safety;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PostCrisisDetectorTest {

    @Test
    void detectsCrisis_nullInput_returnsFalse() {
        assertThat(PostCrisisDetector.detectsCrisis(null)).isFalse();
    }

    @Test
    void detectsCrisis_emptyString_returnsFalse() {
        assertThat(PostCrisisDetector.detectsCrisis("")).isFalse();
    }

    @Test
    void detectsCrisis_whitespaceOnly_returnsFalse() {
        assertThat(PostCrisisDetector.detectsCrisis("   \n\t ")).isFalse();
    }

    @Test
    void detectsCrisis_eachKeywordTriggers() {
        for (String keyword : PostCrisisDetector.SELF_HARM_KEYWORDS) {
            assertThat(PostCrisisDetector.detectsCrisis(keyword))
                    .as("keyword '%s' must trigger detection", keyword)
                    .isTrue();
        }
    }

    @Test
    void detectsCrisis_caseInsensitive() {
        assertThat(PostCrisisDetector.detectsCrisis("SUICIDE")).isTrue();
        assertThat(PostCrisisDetector.detectsCrisis("Suicide")).isTrue();
        assertThat(PostCrisisDetector.detectsCrisis("sUiCiDe")).isTrue();
        assertThat(PostCrisisDetector.detectsCrisis("Kill MYSELF")).isTrue();
    }

    @Test
    void detectsCrisis_keywordEmbeddedInLargerText() {
        assertThat(PostCrisisDetector.detectsCrisis(
                "Please pray for me, sometimes I think about suicide and it scares me."
        )).isTrue();
    }

    @Test
    void detectsCrisis_normalContent_returnsFalse() {
        assertThat(PostCrisisDetector.detectsCrisis(
                "Please pray for my mom's surgery tomorrow."
        )).isFalse();
        assertThat(PostCrisisDetector.detectsCrisis(
                "I'm dying to see her again — it's been so long."
        )).isFalse();  // "die" alone is NOT a keyword; "want to die" is.
    }

    @Test
    void detectsCrisis_keywordList_hasExactly12Entries() {
        // Anchors the keyword list size; if a keyword is added, the parity
        // tests in PostCrisisDetectorParityTest must also be updated.
        assertThat(PostCrisisDetector.SELF_HARM_KEYWORDS).hasSize(12);
    }
}
