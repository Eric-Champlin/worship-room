package com.worshiproom.proxy.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GeminiPrompts")
class GeminiPromptsTest {

    @Test
    @DisplayName("EXPLAIN system prompt contains all 10 numbered rules verbatim")
    void explainContainsAllTenRules() {
        String p = GeminiPrompts.EXPLAIN_SYSTEM_PROMPT;
        assertThat(p).contains("1. Lead with context.");
        assertThat(p).contains("2. Then explain what the passage is doing.");
        assertThat(p).contains("3. Acknowledge uncertainty honestly.");
        assertThat(p).contains("4. Do not prescribe application.");
        assertThat(p).contains("5. Avoid triumphalism.");
        assertThat(p).contains("6. Stay in the text.");
        assertThat(p).contains("7. Acknowledge hard passages honestly.");
        assertThat(p).contains("8. Be restrained in length. Explanations should be 200-400 words");
        assertThat(p).contains("9. Never use the phrases");
        assertThat(p).contains("10. Never recommend prayer, church attendance");
    }

    @Test
    @DisplayName("EXPLAIN system prompt opens with scholar-not-pastor framing")
    void explainOpensWithScholarFraming() {
        assertThat(GeminiPrompts.EXPLAIN_SYSTEM_PROMPT)
            .startsWith("You are a thoughtful biblical scholar")
            .contains("You are not a pastor. You are not a preacher.")
            .contains("World English Bible");
    }

    @Test
    @DisplayName("REFLECT system prompt contains all 10 numbered rules verbatim")
    void reflectContainsAllTenRules() {
        String p = GeminiPrompts.REFLECT_SYSTEM_PROMPT;
        assertThat(p).contains("1. Use interrogative and conditional mood.");
        assertThat(p).contains("2. Offer multiple possibilities, not a single application.");
        assertThat(p).contains("3. Name the reader's agency explicitly.");
        assertThat(p).contains("4. Do not assume the reader's circumstances.");
        assertThat(p).contains("5. Do not prescribe practices.");
        assertThat(p).contains("6. Do not speak for God.");
        assertThat(p).contains("7. Do not weaponize the passage.");
        assertThat(p).contains("8. Be restrained in length. Reflections should be 150-300 words");
        assertThat(p).contains("9. Avoid the \"life lesson\" voice.");
        assertThat(p).contains("10. It is okay to sit with difficulty.");
    }

    @Test
    @DisplayName("buildExplainUserPrompt interpolates reference and verseText")
    void buildExplainInterpolates() {
        String prompt = GeminiPrompts.buildExplainUserPrompt(
            "1 Corinthians 13:4-7", "Love is patient"
        );
        assertThat(prompt)
            .contains("Explain this passage from the World English Bible")
            .contains("1 Corinthians 13:4-7")
            .contains("Love is patient")
            .contains("interpretive difficulties an honest reader should know about");
    }

    @Test
    @DisplayName("buildReflectUserPrompt interpolates reference and verseText")
    void buildReflectInterpolates() {
        String prompt = GeminiPrompts.buildReflectUserPrompt(
            "Philippians 4:6-7", "In nothing be anxious"
        );
        assertThat(prompt)
            .contains("reading this passage from the World English Bible")
            .contains("Philippians 4:6-7")
            .contains("In nothing be anxious")
            .contains("genuine questions and possibilities, not answers or instructions");
    }
}
