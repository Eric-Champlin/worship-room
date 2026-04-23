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

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GeminiController.class)
@Import({ProxyExceptionHandler.class, ProxyConfig.class})
@DisplayName("GeminiController")
class GeminiControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GeminiService geminiService;

    @Test
    @DisplayName("POST /explain returns 200 and ProxyResponse shape on success")
    void explainHappyPath() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("Paul was writing...", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "1 Corinthians 13:4-7",
            "verseText", "Love is patient"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").value("Paul was writing..."))
            .andExpect(jsonPath("$.data.model").value("gemini-2.5-flash-lite"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("POST /reflect returns 200 and ProxyResponse shape on success")
    void reflectHappyPath() throws Exception {
        when(geminiService.generateReflection(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("A reader might ask...", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "Philippians 4:6-7",
            "verseText", "In nothing be anxious"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/reflect")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").value("A reader might ask..."))
            .andExpect(jsonPath("$.data.model").value("gemini-2.5-flash-lite"));
    }

    @Test
    @DisplayName("blank reference returns 400 INVALID_INPUT")
    void blankReferenceReturns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "",
            "verseText", "Love is patient"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("oversized verseText returns 400 INVALID_INPUT")
    void oversizedVerseTextReturns400() throws Exception {
        String huge = "x".repeat(8001);
        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "Psalm 119",
            "verseText", huge
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("SafetyBlockException surfaces as 422 SAFETY_BLOCK")
    void safetyBlockReturns422() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenThrow(new SafetyBlockException("Gemini blocked the prompt: SAFETY"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "some hard passage",
            "verseText", "some hard text"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("SAFETY_BLOCK"));
    }

    @Test
    @DisplayName("UpstreamException surfaces as 502 UPSTREAM_ERROR")
    void upstreamErrorReturns502() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenThrow(new UpstreamException("AI service is temporarily unavailable. Please try again."));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "John 3:16",
            "verseText", "For God so loved..."
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"));
    }

    @Test
    @DisplayName("UpstreamTimeoutException surfaces as 504 UPSTREAM_TIMEOUT")
    void upstreamTimeoutReturns504() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenThrow(new UpstreamTimeoutException("AI service timed out. Please try again."));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "John 3:16",
            "verseText", "For God so loved..."
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isGatewayTimeout())
            .andExpect(jsonPath("$.code").value("UPSTREAM_TIMEOUT"));
    }
}
