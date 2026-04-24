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

import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Journal reflection proxy integration")
class JournalReflectionIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private JournalReflectionService service;

    private JournalReflectionResponseDto canonicalDto() {
        return new JournalReflectionResponseDto(
            "reflect-gen-a8f3",
            "There is so much honesty in what you wrote today. Showing up to write these words is itself a form of prayer. Let yourself be seen here."
        );
    }

    @Test
    @DisplayName("Full lifecycle: X-Request-Id, X-RateLimit-* headers, ProxyResponse body")
    void fullLifecycle_reflect_returnsExpectedHeaders() throws Exception {
        when(service.reflect(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("entry", "Today I felt a lot."));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"))
            .andExpect(jsonPath("$.data.id").value("reflect-gen-a8f3"))
            .andExpect(jsonPath("$.data.text").exists())
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Client-supplied X-Request-Id round-trips into response header and body meta")
    void fullLifecycle_reflect_propagatesClientRequestId() throws Exception {
        when(service.reflect(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("entry", "Today I felt a lot."));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .header("X-Request-Id", "test-reflect-id")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-Id", "test-reflect-id"))
            .andExpect(jsonPath("$.meta.requestId").value("test-reflect-id"));
    }

    @Test
    @DisplayName("Invalid input returns ProxyError shape with full fields")
    void fullLifecycle_invalidInput_returnsProxyErrorShape() throws Exception {
        // Missing entry
        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").exists())
            .andExpect(jsonPath("$.requestId").exists())
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("Upstream error text from cause chain never leaks into response body")
    void fullLifecycle_noUpstreamErrorTextLeaks() throws Exception {
        when(service.reflect(any())).thenThrow(new UpstreamException(
            "AI service is temporarily unavailable. Please try again.",
            new RuntimeException("GoogleSecretKeyABC key=AIzaSyEXAMPLE internal gemini url")
        ));

        String body = objectMapper.writeValueAsString(Map.of("entry", "An entry."));

        MvcResult result = mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
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
    @DisplayName("Crisis path bypasses Gemini and returns valid crisis reflection (not an error)")
    void fullLifecycle_crisisPathBypassesGemini() throws Exception {
        when(service.reflect(any())).thenReturn(JournalReflectionCrisisDetector.buildCrisisResponse());

        String body = objectMapper.writeValueAsString(Map.of("entry", "I want to die"));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value("crisis"))
            .andExpect(jsonPath("$.data.text").value(org.hamcrest.Matchers.containsString("988")));
    }
}
