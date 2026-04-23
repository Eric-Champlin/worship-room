package com.worshiproom.proxy.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PrayerCrisisDetector")
class PrayerCrisisDetectorTest {

    @Test
    @DisplayName("detectsCrisis returns true for each keyword as a whole string")
    void detectsCrisis_returnsTrueForExactKeyword() {
        for (String keyword : PrayerCrisisDetector.SELF_HARM_KEYWORDS) {
            assertThat(PrayerCrisisDetector.detectsCrisis(keyword))
                .as("Keyword '%s' should trigger crisis detection", keyword)
                .isTrue();
        }
    }

    @Test
    @DisplayName("detectsCrisis is case-insensitive")
    void detectsCrisis_caseInsensitive() {
        assertThat(PrayerCrisisDetector.detectsCrisis("KILL MYSELF")).isTrue();
        assertThat(PrayerCrisisDetector.detectsCrisis("Kill Myself")).isTrue();
        assertThat(PrayerCrisisDetector.detectsCrisis("kIlL mYsElF")).isTrue();
    }

    @Test
    @DisplayName("detectsCrisis matches keywords as substrings within a sentence")
    void detectsCrisis_substringMatch() {
        assertThat(PrayerCrisisDetector.detectsCrisis("I want to die tonight")).isTrue();
        assertThat(PrayerCrisisDetector.detectsCrisis("I'm thinking of suicide")).isTrue();
    }

    @Test
    @DisplayName("detectsCrisis returns false for null or blank input")
    void detectsCrisis_returnsFalseForNullOrBlank() {
        assertThat(PrayerCrisisDetector.detectsCrisis(null)).isFalse();
        assertThat(PrayerCrisisDetector.detectsCrisis("")).isFalse();
        assertThat(PrayerCrisisDetector.detectsCrisis("   ")).isFalse();
    }

    @Test
    @DisplayName("detectsCrisis returns false for unrelated text")
    void detectsCrisis_returnsFalseForUnrelatedText() {
        assertThat(PrayerCrisisDetector.detectsCrisis("pray for my job interview")).isFalse();
        assertThat(PrayerCrisisDetector.detectsCrisis("help me with anxiety")).isFalse();
        assertThat(PrayerCrisisDetector.detectsCrisis("I feel anxious about tomorrow")).isFalse();
    }

    @Test
    @DisplayName("Parity with frontend: backend list is a superset of frontend SELF_HARM_KEYWORDS")
    void parityWithFrontend() throws IOException {
        String src = Files.readString(Path.of("../frontend/src/constants/crisis-resources.ts"));
        Pattern arrayPattern = Pattern.compile(
            "SELF_HARM_KEYWORDS\\s*=\\s*\\[([^\\]]*)\\]", Pattern.DOTALL);
        Matcher m = arrayPattern.matcher(src);
        assertThat(m.find()).as("Could not locate SELF_HARM_KEYWORDS in frontend file").isTrue();
        String body = m.group(1);
        Pattern literalPattern = Pattern.compile("'([^']+)'|\"([^\"]+)\"");
        Matcher lm = literalPattern.matcher(body);
        List<String> frontendKeywords = new ArrayList<>();
        while (lm.find()) {
            String kw = lm.group(1) != null ? lm.group(1) : lm.group(2);
            frontendKeywords.add(kw.toLowerCase(Locale.ROOT));
        }
        assertThat(frontendKeywords).isNotEmpty();
        assertThat(PrayerCrisisDetector.SELF_HARM_KEYWORDS)
            .as("Backend PrayerCrisisDetector.SELF_HARM_KEYWORDS must be a superset of the frontend list")
            .containsAll(frontendKeywords);
    }

    @Test
    @DisplayName("Parity with AskCrisisDetector: lists must be element-equal (AD #5)")
    void parityWithAskDetector() {
        assertThat(PrayerCrisisDetector.SELF_HARM_KEYWORDS)
            .as("PrayerCrisisDetector.SELF_HARM_KEYWORDS must equal AskCrisisDetector.SELF_HARM_KEYWORDS byte-for-byte")
            .containsExactlyInAnyOrderElementsOf(AskCrisisDetector.SELF_HARM_KEYWORDS);
    }

    @Test
    @DisplayName("buildCrisisResponse returns valid shape with all required fields")
    void buildCrisisResponse_returnsValidShape() {
        PrayerResponseDto dto = PrayerCrisisDetector.buildCrisisResponse();

        assertThat(dto.id()).isEqualTo("crisis");
        assertThat(dto.topic()).isEqualTo("crisis");
        assertThat(dto.text()).isNotBlank();
        assertThat(dto.text()).startsWith("Dear God");
        assertThat(dto.text()).endsWith("Amen.");
        assertThat(dto.text()).contains("988");
        assertThat(dto.text()).contains("741741");
        assertThat(dto.text().length()).isBetween(100, 2000);
    }
}
