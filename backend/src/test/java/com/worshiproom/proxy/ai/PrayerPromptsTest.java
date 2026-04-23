package com.worshiproom.proxy.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PrayerPrompts")
class PrayerPromptsTest {

    @Test
    @DisplayName("Rule 1: text must start with \"Dear God,\"")
    void systemPrompt_rule1_startWithDearGod() {
        assertThat(PrayerPrompts.PRAYER_SYSTEM_PROMPT).contains("\"Dear God,\"");
    }

    @Test
    @DisplayName("Rule 2: text must end with \"Amen.\"")
    void systemPrompt_rule2_endWithAmen() {
        assertThat(PrayerPrompts.PRAYER_SYSTEM_PROMPT).contains("\"Amen.\"");
    }

    @Test
    @DisplayName("Rule 3: write in first person")
    void systemPrompt_rule3_firstPerson() {
        assertThat(PrayerPrompts.PRAYER_SYSTEM_PROMPT).contains("first person");
    }

    @Test
    @DisplayName("Rule 4: 100-180 word count")
    void systemPrompt_rule4_wordCount() {
        assertThat(PrayerPrompts.PRAYER_SYSTEM_PROMPT).contains("100-180 words");
    }

    @Test
    @DisplayName("Rule 5: acknowledge the specific thing")
    void systemPrompt_rule5_acknowledgeSpecific() {
        assertThat(PrayerPrompts.PRAYER_SYSTEM_PROMPT).contains("Acknowledge the specific thing");
    }

    @Test
    @DisplayName("Rule 6: topic enum contains all 10 allowed values")
    void systemPrompt_rule6_topicEnum() {
        List<String> allowedTopics = List.of(
            "anxiety", "gratitude", "healing", "guidance", "grief",
            "forgiveness", "relationships", "strength", "general", "devotional"
        );
        for (String topic : allowedTopics) {
            assertThat(PrayerPrompts.PRAYER_SYSTEM_PROMPT)
                .as("System prompt should contain topic value '%s'", topic)
                .contains(topic);
        }
    }

    @Test
    @DisplayName("Retry corrective suffix mentions key requirements")
    void retryCorrectiveSuffix_mentionsKeyRequirements() {
        assertThat(PrayerPrompts.RETRY_CORRECTIVE_SUFFIX).contains("Dear God");
        assertThat(PrayerPrompts.RETRY_CORRECTIVE_SUFFIX).contains("Amen.");
        assertThat(PrayerPrompts.RETRY_CORRECTIVE_SUFFIX).contains("100-180 words");
    }
}
