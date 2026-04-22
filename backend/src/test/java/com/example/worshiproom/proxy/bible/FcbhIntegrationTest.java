package com.example.worshiproom.proxy.bible;

import com.example.worshiproom.proxy.common.UpstreamException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Full-stack integration test for the FCBH proxy.
 *
 * <p>Uses {@code @SpringBootTest} + {@code @AutoConfigureMockMvc} so the real
 * filter chain runs — {@code RequestIdFilter} populates MDC, {@code RateLimitFilter}
 * emits rate-limit headers, and {@code ProxyExceptionHandler} shapes error bodies.
 * Only {@code FcbhService} is mocked, so the upstream DBP call is never made.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("FCBH proxy integration")
class FcbhIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private FcbhService service;

    @Test
    @DisplayName("Full lifecycle: getChapter returns expected headers (X-Request-Id + rate-limit)")
    void fullLifecycle_getChapter_returnsHeaders() throws Exception {
        Map<String, Object> envelope = Map.of(
            "data", List.of(Map.of(
                "book_id", "JHN",
                "path", "https://d1gd73roq7kqw6.cloudfront.net/.../john3.mp3?Signature=sig",
                "duration", 321)),
            "meta", Map.of());
        when(service.getChapter(anyString(), anyString(), anyInt())).thenReturn(envelope);

        mockMvc.perform(get("/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3"))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"))
            .andExpect(jsonPath("$.data.data[0].book_id").value("JHN"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Full lifecycle: propagates client-supplied X-Request-Id")
    void fullLifecycle_propagatesClientRequestId() throws Exception {
        Map<String, Object> envelope = Map.of("data", List.of(), "meta", Map.of());
        when(service.getChapter(anyString(), anyString(), anyInt())).thenReturn(envelope);

        mockMvc.perform(get("/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3")
                .header("X-Request-Id", "test-fcbh-req-abc123"))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-Id", "test-fcbh-req-abc123"))
            .andExpect(jsonPath("$.meta.requestId").value("test-fcbh-req-abc123"));
    }

    @Test
    @DisplayName("Full lifecycle: invalid path param returns ProxyError shape with timestamp")
    void fullLifecycle_invalidPathParam_returnsProxyError() throws Exception {
        mockMvc.perform(get("/api/v1/proxy/bible/filesets/bad!!/JHN/3"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").exists())
            .andExpect(jsonPath("$.requestId").exists())
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("Full lifecycle: 404 returns ProxyError shape with NOT_FOUND code")
    void fullLifecycle_404returnsProxyErrorShape() throws Exception {
        when(service.getChapter(anyString(), anyString(), anyInt()))
            .thenThrow(new FcbhNotFoundException("Audio not available for this chapter."));

        mockMvc.perform(get("/api/v1/proxy/bible/filesets/EN1WEBO2DA/PSA/151"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Audio not available for this chapter."))
            .andExpect(jsonPath("$.requestId").exists())
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("Full lifecycle: upstream error cause text never leaks to response body")
    void fullLifecycle_noApiKeyLeakInErrorBody() throws Exception {
        // Service throws generic-message UpstreamException with a key-bearing cause.
        // The serialized response must contain only the generic message — the cause's
        // toString() must not appear.
        when(service.getChapter(anyString(), anyString(), anyInt()))
            .thenThrow(new UpstreamException(
                "FCBH service is temporarily unavailable. Please try again.",
                new RuntimeException("AIzaLeakABC123 internal-fcbh-debug-text key=secret123 from 4.dbt.io")));

        mockMvc.perform(get("/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"))
            .andExpect(jsonPath("$.message", not(containsString("AIza"))))
            .andExpect(jsonPath("$.message", not(containsString("key="))))
            .andExpect(jsonPath("$.message", not(containsString("4.dbt.io"))))
            .andExpect(jsonPath("$.message", not(containsString("secret"))));
    }
}
