package com.example.worshiproom.proxy.ai;

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

@DisplayName("AskCrisisDetector")
class AskCrisisDetectorTest {

    @Test
    @DisplayName("detectsCrisis returns true for each keyword as a whole string")
    void detectsCrisis_returnsTrueForExactKeyword() {
        for (String keyword : AskCrisisDetector.SELF_HARM_KEYWORDS) {
            assertThat(AskCrisisDetector.detectsCrisis(keyword))
                .as("Keyword '%s' should trigger crisis detection", keyword)
                .isTrue();
        }
    }

    @Test
    @DisplayName("detectsCrisis is case-insensitive")
    void detectsCrisis_caseInsensitive() {
        assertThat(AskCrisisDetector.detectsCrisis("KILL MYSELF")).isTrue();
        assertThat(AskCrisisDetector.detectsCrisis("Kill Myself")).isTrue();
        assertThat(AskCrisisDetector.detectsCrisis("kIlL mYsElF")).isTrue();
    }

    @Test
    @DisplayName("detectsCrisis matches keywords as substrings within a sentence")
    void detectsCrisis_substringMatch() {
        assertThat(AskCrisisDetector.detectsCrisis("I'm thinking of suicide tonight")).isTrue();
        assertThat(AskCrisisDetector.detectsCrisis("Sometimes I feel like I want to die, I don't know"))
            .isTrue();
    }

    @Test
    @DisplayName("detectsCrisis returns false for null or blank input")
    void detectsCrisis_returnsFalseForNullOrBlank() {
        assertThat(AskCrisisDetector.detectsCrisis(null)).isFalse();
        assertThat(AskCrisisDetector.detectsCrisis("")).isFalse();
        assertThat(AskCrisisDetector.detectsCrisis("   ")).isFalse();
    }

    @Test
    @DisplayName("detectsCrisis returns false for unrelated text")
    void detectsCrisis_returnsFalseForUnrelatedText() {
        assertThat(AskCrisisDetector.detectsCrisis("How do I forgive my brother?")).isFalse();
        assertThat(AskCrisisDetector.detectsCrisis("What does the Bible say about anxiety?")).isFalse();
        assertThat(AskCrisisDetector.detectsCrisis("Why does God allow suffering?")).isFalse();
    }

    @Test
    @DisplayName("parity with frontend: backend list is a superset of frontend SELF_HARM_KEYWORDS")
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
        assertThat(AskCrisisDetector.SELF_HARM_KEYWORDS)
            .as("Backend SELF_HARM_KEYWORDS must be a superset of the frontend list")
            .containsAll(frontendKeywords);
    }

    @Test
    @DisplayName("buildCrisisResponse returns valid shape with all required fields")
    void buildCrisisResponse_returnsValidShape() {
        AskResponseDto dto = AskCrisisDetector.buildCrisisResponse();

        assertThat(dto.id()).isEqualTo("crisis");
        assertThat(dto.topic()).isNotBlank();
        assertThat(dto.answer()).isNotBlank();
        assertThat(dto.answer()).contains("988");
        assertThat(dto.encouragement()).isNotBlank();
        assertThat(dto.prayer()).isNotBlank();

        assertThat(dto.verses()).hasSize(3);
        for (AskVerseDto verse : dto.verses()) {
            assertThat(verse).isNotNull();
            assertThat(verse.reference()).isNotBlank();
            assertThat(verse.text()).isNotBlank();
            assertThat(verse.explanation()).isNotBlank();
        }

        assertThat(dto.followUpQuestions()).hasSize(3);
        for (String q : dto.followUpQuestions()) {
            assertThat(q).isNotBlank();
        }
    }
}
