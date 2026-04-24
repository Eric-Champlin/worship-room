package com.worshiproom.proxy.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JournalReflectionPrompts")
class JournalReflectionPromptsTest {

    @Test
    @DisplayName("System prompt rule 1: second person, never first person")
    void systemPrompt_rule1_secondPerson() {
        assertThat(JournalReflectionPrompts.REFLECTION_SYSTEM_PROMPT)
            .contains("second person")
            .contains("Never use first person");
    }

    @Test
    @DisplayName("System prompt rule 2: 2-4 sentences")
    void systemPrompt_rule2_twoToFourSentences() {
        assertThat(JournalReflectionPrompts.REFLECTION_SYSTEM_PROMPT)
            .contains("2-4 sentences");
    }

    @Test
    @DisplayName("System prompt rule 3: specific detail, do not generalize")
    void systemPrompt_rule3_specificDetail() {
        assertThat(JournalReflectionPrompts.REFLECTION_SYSTEM_PROMPT)
            .contains("SPECIFIC")
            .contains("Do not generalize");
    }

    @Test
    @DisplayName("System prompt rule 4: affirm writing as meaningful; journaling is a form of prayer")
    void systemPrompt_rule4_affirmWriting() {
        assertThat(JournalReflectionPrompts.REFLECTION_SYSTEM_PROMPT)
            .contains("writing itself as meaningful")
            .contains("journaling is a form of prayer");
    }

    @Test
    @DisplayName("System prompt rule 5: guardrails — no prescribing, no scripture quoting, no over-spiritualizing")
    void systemPrompt_rule5_guardrails() {
        assertThat(JournalReflectionPrompts.REFLECTION_SYSTEM_PROMPT)
            .contains("Do NOT prescribe")
            .contains("do NOT quote scripture")
            .contains("do NOT over-spiritualize");
    }

    @Test
    @DisplayName("Retry corrective suffix mentions length bounds and sentence count")
    void retryCorrectiveSuffix_mentionsLengthBounds() {
        assertThat(JournalReflectionPrompts.RETRY_CORRECTIVE_SUFFIX)
            .contains("50-800 characters")
            .contains("2-4 sentences");
    }
}
