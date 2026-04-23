package com.worshiproom.proxy.ai;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.ProxyExceptionHandler;
import com.worshiproom.proxy.common.SafetyBlockException;
import com.worshiproom.proxy.common.UpstreamException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AskController.class)
@Import({ProxyExceptionHandler.class, ProxyConfig.class})
@DisplayName("AskController")
class AskControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AskService service;

    private AskResponseDto canonicalDto() {
        return new AskResponseDto(
            "suffering",
            "Why Suffering Exists",
            "A thoughtful answer about suffering, long enough to feel real.",
            List.of(
                new AskVerseDto("Romans 8:28", "We know that all things work together for good...", "God is at work."),
                new AskVerseDto("Psalm 34:18", "Yahweh is near to those who have a broken heart.", "You are not alone."),
                new AskVerseDto("2 Corinthians 1:3-4", "Blessed be the God and Father...", "Comfort flows onward.")
            ),
            "God is close when you hurt.",
            "Lord, sit with me in this.",
            List.of("How do I trust God?", "What does Scripture say about lament?", "How can suffering deepen faith?")
        );
    }

    @Test
    @DisplayName("Happy path returns 200 with ProxyResponse body")
    void ask_happyPath_returns200WithBody() throws Exception {
        when(service.ask(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of(
            "question", "Why does God allow suffering?"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value("suffering"))
            .andExpect(jsonPath("$.data.verses[0].reference").value("Romans 8:28"))
            .andExpect(jsonPath("$.data.followUpQuestions.length()").value(3))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Missing question returns 400 INVALID_INPUT")
    void ask_missingQuestion_returns400() throws Exception {
        String body = "{}";

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Blank question returns 400 via @NotBlank")
    void ask_blankQuestion_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("question", "   "));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Question longer than 500 chars returns 400")
    void ask_questionTooLong_returns400() throws Exception {
        String tooLong = "a".repeat(501);
        String body = objectMapper.writeValueAsString(Map.of("question", tooLong));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Conversation history with 7 entries returns 400 via @Size(max=6)")
    void ask_conversationHistoryTooLong_returns400() throws Exception {
        List<Map<String, String>> history = List.of(
            Map.of("role", "user", "content", "q1"),
            Map.of("role", "assistant", "content", "a1"),
            Map.of("role", "user", "content", "q2"),
            Map.of("role", "assistant", "content", "a2"),
            Map.of("role", "user", "content", "q3"),
            Map.of("role", "assistant", "content", "a3"),
            Map.of("role", "user", "content", "q4")
        );
        Map<String, Object> bodyMap = new HashMap<>();
        bodyMap.put("question", "Follow-up?");
        bodyMap.put("conversationHistory", history);

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(bodyMap)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Invalid role in history returns 400 via @Pattern")
    void ask_invalidRoleInHistory_returns400() throws Exception {
        List<Map<String, String>> history = List.of(
            Map.of("role", "system", "content", "Do something")
        );
        Map<String, Object> bodyMap = new HashMap<>();
        bodyMap.put("question", "Why?");
        bodyMap.put("conversationHistory", history);

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(bodyMap)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Content longer than 2000 chars in history returns 400")
    void ask_contentTooLongInHistory_returns400() throws Exception {
        String tooLong = "x".repeat(2001);
        List<Map<String, String>> history = List.of(
            Map.of("role", "user", "content", tooLong)
        );
        Map<String, Object> bodyMap = new HashMap<>();
        bodyMap.put("question", "Why?");
        bodyMap.put("conversationHistory", history);

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(bodyMap)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Null conversationHistory is accepted")
    void ask_nullConversationHistoryAccepted() throws Exception {
        when(service.ask(any())).thenReturn(canonicalDto());

        // conversationHistory field absent entirely
        String body = objectMapper.writeValueAsString(Map.of("question", "Why?"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value("suffering"));
    }

    @Test
    @DisplayName("Service-thrown SafetyBlockException maps to 422")
    void ask_serviceThrowsSafetyBlock_returns422() throws Exception {
        when(service.ask(any())).thenThrow(new SafetyBlockException("blocked"));

        String body = objectMapper.writeValueAsString(Map.of("question", "A hard question"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("SAFETY_BLOCK"));
    }

    @Test
    @DisplayName("Service-thrown UpstreamException maps to 502")
    void ask_serviceThrowsUpstream_returns502() throws Exception {
        when(service.ask(any())).thenThrow(new UpstreamException("AI service is temporarily unavailable. Please try again."));

        String body = objectMapper.writeValueAsString(Map.of("question", "Why?"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"));
    }

    @Test
    @DisplayName("Response includes X-Request-Id header (set by RequestIdFilter)")
    void ask_xRequestIdHeaderPresent() throws Exception {
        when(service.ask(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("question", "Why?"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"));
    }
}
