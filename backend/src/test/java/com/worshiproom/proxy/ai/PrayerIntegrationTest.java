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
@DisplayName("Prayer proxy integration")
class PrayerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private PrayerService service;

    private PrayerResponseDto canonicalDto() {
        return new PrayerResponseDto(
            "prayer-anxiety-gen-a8f3",
            "anxiety",
            "Dear God, I come to You with the weight of tomorrow pressing on me. I trust You. Amen."
        );
    }

    @Test
    @DisplayName("Full lifecycle: X-Request-Id, X-RateLimit-* headers, ProxyResponse body")
    void fullLifecycle_pray_returnsExpectedHeaders() throws Exception {
        when(service.pray(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("request", "I'm anxious"));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"))
            .andExpect(jsonPath("$.data.id").value("prayer-anxiety-gen-a8f3"))
            .andExpect(jsonPath("$.data.topic").value("anxiety"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Client-supplied X-Request-Id round-trips into response header and body meta")
    void fullLifecycle_pray_propagatesClientRequestId() throws Exception {
        when(service.pray(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("request", "I'm anxious"));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .header("X-Request-Id", "test-pray-id")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-Id", "test-pray-id"))
            .andExpect(jsonPath("$.meta.requestId").value("test-pray-id"));
    }

    @Test
    @DisplayName("Invalid input returns ProxyError shape with full fields")
    void fullLifecycle_invalidInput_returnsProxyErrorShape() throws Exception {
        // Missing request
        mockMvc.perform(post("/api/v1/proxy/ai/pray")
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
        when(service.pray(any())).thenThrow(new UpstreamException(
            "AI service is temporarily unavailable. Please try again.",
            new RuntimeException("GoogleSecretKeyABC key=AIzaSyEXAMPLE internal gemini url")
        ));

        String body = objectMapper.writeValueAsString(Map.of("request", "Help me pray"));

        MvcResult result = mockMvc.perform(post("/api/v1/proxy/ai/pray")
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
    @DisplayName("Crisis path bypasses Gemini and returns valid crisis prayer (not an error)")
    void fullLifecycle_crisisPathBypassesGemini() throws Exception {
        // Service short-circuits crisis requests to the canned crisis response.
        when(service.pray(any())).thenReturn(PrayerCrisisDetector.buildCrisisResponse());

        String body = objectMapper.writeValueAsString(Map.of("request", "I want to die"));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value("crisis"))
            .andExpect(jsonPath("$.data.topic").value("crisis"))
            .andExpect(jsonPath("$.data.text").value(org.hamcrest.Matchers.containsString("988")));
    }
}
