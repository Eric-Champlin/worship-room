package com.worshiproom.proxy.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.proxy.common.UpstreamException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Ask proxy integration")
class AskIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AskService service;

    private AskResponseDto canonicalDto() {
        return new AskResponseDto(
            "suffering",
            "Why Suffering Exists",
            "A thoughtful answer.",
            List.of(
                new AskVerseDto("Romans 8:28", "All things work together...", "God is at work."),
                new AskVerseDto("Psalm 34:18", "Yahweh is near...", "You are not alone."),
                new AskVerseDto("2 Cor 1:3-4", "Blessed be the God...", "Comfort flows onward.")
            ),
            "God is close when you hurt.",
            "Lord, sit with me in this.",
            List.of("Q1", "Q2", "Q3")
        );
    }

    @Test
    @DisplayName("Full lifecycle: X-Request-Id, X-RateLimit-* headers, ProxyResponse body")
    void fullLifecycle_ask_returnsExpectedHeaders() throws Exception {
        when(service.ask(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("question", "Why?"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"))
            .andExpect(jsonPath("$.data.id").value("suffering"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Client-supplied X-Request-Id round-trips into response header and body meta")
    void fullLifecycle_ask_propagatesClientRequestId() throws Exception {
        when(service.ask(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("question", "Why?"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .header("X-Request-Id", "test-ask-request-id")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-Id", "test-ask-request-id"))
            .andExpect(jsonPath("$.meta.requestId").value("test-ask-request-id"));
    }

    @Test
    @DisplayName("Invalid input returns ProxyError shape with full fields")
    void fullLifecycle_invalidInput_returnsProxyErrorShape() throws Exception {
        // Missing question
        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").exists())
            .andExpect(jsonPath("$.requestId").exists())
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("Unconfigured Gemini (service throws not-configured UpstreamException) returns 502")
    void fullLifecycle_unconfiguredReturns502() throws Exception {
        when(service.ask(any())).thenThrow(new UpstreamException("AI service is not configured on the server."));

        String body = objectMapper.writeValueAsString(Map.of("question", "Why?"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("not configured")));
    }

    @Test
    @DisplayName("Upstream error text from cause chain never leaks into response body")
    void fullLifecycle_noUpstreamErrorTextLeaks() throws Exception {
        when(service.ask(any())).thenThrow(new UpstreamException(
            "AI service is temporarily unavailable. Please try again.",
            new RuntimeException("GoogleSecretKeyABC key=AIzaSyEXAMPLE internal gemini url")
        ));

        String body = objectMapper.writeValueAsString(Map.of("question", "Why?"));

        MvcResult result = mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadGateway())
            .andReturn();

        String responseBody = result.getResponse().getContentAsString().toLowerCase(Locale.ROOT);
        assertThat(responseBody).doesNotContain("googlesecretkeyabc");
        assertThat(responseBody).doesNotContain("aiza");
        assertThat(responseBody).doesNotContain("gemini");
        assertThat(responseBody).doesNotContain("google");
        assertThat(responseBody).doesNotContain("key=");
    }

    @Test
    @DisplayName("Crisis path bypasses Gemini and returns valid crisis response (not an error)")
    void fullLifecycle_crisisPathBypassesGemini() throws Exception {
        // Service short-circuits crisis questions to the canned crisis response.
        when(service.ask(any())).thenReturn(AskCrisisDetector.buildCrisisResponse());

        String body = objectMapper.writeValueAsString(Map.of("question", "I want to die"));

        mockMvc.perform(post("/api/v1/proxy/ai/ask")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value("crisis"))
            .andExpect(jsonPath("$.data.answer").value(org.hamcrest.Matchers.containsString("988")));
    }
}
