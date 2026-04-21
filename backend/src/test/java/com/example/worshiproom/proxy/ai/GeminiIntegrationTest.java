package com.example.worshiproom.proxy.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Gemini proxy integration")
class GeminiIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GeminiService geminiService;

    @Test
    @DisplayName("Full request lifecycle: X-Request-Id, X-RateLimit-* headers, ProxyResponse body")
    void fullLifecycle() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("explanation text", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "1 John 4:7-8",
            "verseText", "Beloved, let us love one another"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"))
            .andExpect(jsonPath("$.data.content").value("explanation text"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("X-Request-Id on request is honored on response")
    void honorsClientRequestId() throws Exception {
        when(geminiService.generateExplanation(anyString(), anyString()))
            .thenReturn(new GeminiResponseDto("content", "gemini-2.5-flash-lite"));

        String body = objectMapper.writeValueAsString(Map.of(
            "reference", "John 1:1",
            "verseText", "In the beginning was the Word"
        ));

        mockMvc.perform(post("/api/v1/proxy/ai/explain")
                .header("X-Request-Id", "test-client-request-id")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-Id", "test-client-request-id"))
            .andExpect(jsonPath("$.meta.requestId").value("test-client-request-id"));
    }
}
