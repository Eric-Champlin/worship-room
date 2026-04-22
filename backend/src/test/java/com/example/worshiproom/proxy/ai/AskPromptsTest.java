package com.example.worshiproom.proxy.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AskPrompts")
class AskPromptsTest {

    @Test
    @DisplayName("Rule 1: WEB translation stated verbatim")
    void systemPrompt_rule1_webTranslation() {
        assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("World English Bible (WEB)");
    }

    @Test
    @DisplayName("Rule 2: exactly 3 verses required")
    void systemPrompt_rule2_exactly3Verses() {
        assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("exactly 3 verses");
    }

    @Test
    @DisplayName("Rule 3: exactly 3 follow-up questions required")
    void systemPrompt_rule3_exactly3FollowUps() {
        assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("exactly 3 follow-up questions");
    }

    @Test
    @DisplayName("Rule 4: warm second-person voice")
    void systemPrompt_rule4_secondPerson() {
        assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("warm second-person voice");
    }

    @Test
    @DisplayName("Rule 5: acknowledge pain")
    void systemPrompt_rule5_acknowledgePain() {
        assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("Acknowledge pain");
    }

    @Test
    @DisplayName("Rule 6: prayer field is first-person")
    void systemPrompt_rule6_prayerFirstPerson() {
        assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("first-person prayer");
    }

    @Test
    @DisplayName("Rule 7: encouragement is one short sentence")
    void systemPrompt_rule7_encouragementShort() {
        assertThat(AskPrompts.ASK_SYSTEM_PROMPT).contains("one short sentence");
    }

    @Test
    @DisplayName("Rule 8: id enum contains all 16 allowed values")
    void systemPrompt_rule8_idEnum() {
        List<String> allowedIds = List.of(
            "suffering", "forgiveness", "anxiety", "purpose", "doubt", "prayer",
            "grief", "loneliness", "anger", "marriage", "parenting", "money",
            "identity", "temptation", "afterlife", "fallback"
        );
        for (String id : allowedIds) {
            assertThat(AskPrompts.ASK_SYSTEM_PROMPT)
                .as("System prompt should contain id value '%s'", id)
                .contains(id);
        }
    }

    @Test
    @DisplayName("buildUserPrompt with null history returns 'Question: ...'")
    void buildUserPrompt_noHistory_returnsQuestionOnly() {
        String result = AskPrompts.buildUserPrompt("Why?", null);
        assertThat(result).isEqualTo("Question: Why?");
    }

    @Test
    @DisplayName("buildUserPrompt with history formats per spec")
    void buildUserPrompt_withHistory_formatsCorrectly() {
        List<ConversationMessage> history = List.of(
            new ConversationMessage("user", "Why does God allow suffering?"),
            new ConversationMessage("assistant", "God often uses suffering to deepen trust.")
        );
        String result = AskPrompts.buildUserPrompt("Tell me more.", history);
        assertThat(result).startsWith("Previous conversation:\n\nUser: Why does God allow suffering?\n\nAssistant: God often uses suffering to deepen trust.\n\nFollow-up question: Tell me more.");
    }

    @Test
    @DisplayName("buildUserPrompt treats empty history same as null")
    void buildUserPrompt_emptyHistoryTreatedAsNull() {
        String result = AskPrompts.buildUserPrompt("Why?", List.of());
        assertThat(result).isEqualTo("Question: Why?");
    }
}
