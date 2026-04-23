package com.worshiproom.proxy.ai;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.ProxyExceptionHandler;
import com.worshiproom.proxy.common.SafetyBlockException;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PrayerController.class)
@Import({ProxyExceptionHandler.class, ProxyConfig.class})
@DisplayName("PrayerController")
class PrayerControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private PrayerService service;

    private PrayerResponseDto canonicalDto() {
        return new PrayerResponseDto(
            "prayer-anxiety-gen-a8f3",
            "anxiety",
            "Dear God, I come to You with the weight of tomorrow pressing on me. I trust You to walk with me into that courtroom. Amen."
        );
    }

    @Test
    @DisplayName("Happy path returns 200 with ProxyResponse body")
    void pray_happyPath_returns200WithBody() throws Exception {
        when(service.pray(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of(
            "request", "I'm anxious about my hearing tomorrow"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value("prayer-anxiety-gen-a8f3"))
            .andExpect(jsonPath("$.data.topic").value("anxiety"))
            .andExpect(jsonPath("$.data.text").exists())
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Missing request returns 400 INVALID_INPUT")
    void pray_missingRequest_returns400() throws Exception {
        String body = "{}";

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Blank request returns 400 via @NotBlank")
    void pray_blankRequest_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("request", "   "));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Request longer than 500 chars returns 400")
    void pray_requestTooLong_returns400() throws Exception {
        String tooLong = "a".repeat(501);
        String body = objectMapper.writeValueAsString(Map.of("request", tooLong));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Service-thrown SafetyBlockException maps to 422")
    void pray_serviceThrowsSafetyBlock_returns422() throws Exception {
        when(service.pray(any())).thenThrow(new SafetyBlockException("blocked"));

        String body = objectMapper.writeValueAsString(Map.of("request", "A hard request"));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("SAFETY_BLOCK"));
    }

    @Test
    @DisplayName("Service-thrown UpstreamException maps to 502")
    void pray_serviceThrowsUpstream_returns502() throws Exception {
        when(service.pray(any())).thenThrow(new UpstreamException("AI service is temporarily unavailable. Please try again."));

        String body = objectMapper.writeValueAsString(Map.of("request", "Help me pray"));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"));
    }

    @Test
    @DisplayName("Service-thrown UpstreamTimeoutException maps to 504")
    void pray_serviceThrowsTimeout_returns504() throws Exception {
        when(service.pray(any())).thenThrow(new UpstreamTimeoutException("AI service timed out. Please try again.", new RuntimeException("timeout")));

        String body = objectMapper.writeValueAsString(Map.of("request", "Help me pray"));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isGatewayTimeout())
            .andExpect(jsonPath("$.code").value("UPSTREAM_TIMEOUT"));
    }

    @Test
    @DisplayName("Response includes X-Request-Id header (set by RequestIdFilter)")
    void pray_xRequestIdHeaderPresent() throws Exception {
        when(service.pray(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("request", "Help me pray"));

        mockMvc.perform(post("/api/v1/proxy/ai/pray")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"));
    }
}
