package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.ProxyExceptionHandler;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
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

@WebMvcTest(JournalReflectionController.class)
@Import({ProxyExceptionHandler.class, ProxyConfig.class})
@DisplayName("JournalReflectionController")
class JournalReflectionControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private JournalReflectionService service;

    private JournalReflectionResponseDto canonicalDto() {
        return new JournalReflectionResponseDto(
            "reflect-gen-a8f3",
            "There is so much honesty in what you wrote about the weight you're carrying today. You named the fear by name, and that takes courage. Showing up to write these words is already a kind of prayer. Let yourself be seen here."
        );
    }

    @Test
    @DisplayName("Happy path returns 200 with ProxyResponse body")
    void reflect_happyPath_returns200WithBody() throws Exception {
        when(service.reflect(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of(
            "entry", "Today I sat in silence for a long time thinking about my grandmother."
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value("reflect-gen-a8f3"))
            .andExpect(jsonPath("$.data.text").exists())
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Missing entry returns 400 INVALID_INPUT")
    void reflect_missingEntry_returns400() throws Exception {
        String body = "{}";

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Blank entry returns 400 via @NotBlank")
    void reflect_blankEntry_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("entry", "   "));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Entry longer than 5000 chars returns 400")
    void reflect_entryTooLong_returns400() throws Exception {
        String tooLong = "a".repeat(5001);
        String body = objectMapper.writeValueAsString(Map.of("entry", tooLong));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("Service-thrown SafetyBlockException maps to 422")
    void reflect_serviceThrowsSafetyBlock_returns422() throws Exception {
        when(service.reflect(any())).thenThrow(new SafetyBlockException("blocked"));

        String body = objectMapper.writeValueAsString(Map.of("entry", "A difficult entry."));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("SAFETY_BLOCK"));
    }

    @Test
    @DisplayName("Service-thrown UpstreamException maps to 502")
    void reflect_serviceThrowsUpstream_returns502() throws Exception {
        when(service.reflect(any())).thenThrow(new UpstreamException("AI service is temporarily unavailable. Please try again."));

        String body = objectMapper.writeValueAsString(Map.of("entry", "An entry."));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"));
    }

    @Test
    @DisplayName("Service-thrown UpstreamTimeoutException maps to 504")
    void reflect_serviceThrowsTimeout_returns504() throws Exception {
        when(service.reflect(any())).thenThrow(new UpstreamTimeoutException("AI service timed out. Please try again.", new RuntimeException("timeout")));

        String body = objectMapper.writeValueAsString(Map.of("entry", "An entry."));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isGatewayTimeout())
            .andExpect(jsonPath("$.code").value("UPSTREAM_TIMEOUT"));
    }

    @Test
    @DisplayName("Response includes X-Request-Id header (set by RequestIdFilter)")
    void reflect_xRequestIdHeaderPresent() throws Exception {
        when(service.reflect(any())).thenReturn(canonicalDto());

        String body = objectMapper.writeValueAsString(Map.of("entry", "An entry."));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect-journal")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"));
    }
}
