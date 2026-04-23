package com.worshiproom.proxy.bible;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.ProxyExceptionHandler;
import com.worshiproom.proxy.common.UpstreamException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FcbhController.class)
@Import({ProxyExceptionHandler.class, ProxyConfig.class})
@DisplayName("FcbhController")
class FcbhControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private FcbhService service;

    // ─── Happy paths (2 tests) ───────────────────────────────────────────

    @Test
    @DisplayName("GET /bibles happy path returns 200 with ProxyResponse envelope")
    void listBibles_happyPath_returns200WithEnvelope() throws Exception {
        Map<String, Object> envelope = Map.of(
            "data", List.of(Map.of("id", "ENGWWH", "name", "World English Bible")),
            "meta", Map.of("pagination", Map.of("total", 1)));
        when(service.listBibles("eng")).thenReturn(envelope);

        mockMvc.perform(get("/api/v1/proxy/bible/bibles").param("language", "eng"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.data[0].id").value("ENGWWH"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("GET /timestamps happy path returns 200 with empty data array (OT filesets)")
    void getTimestamps_happyPath_returns200_withEmptyData() throws Exception {
        Map<String, Object> envelope = Map.of("data", List.of(), "meta", Map.of());
        when(service.getTimestamps("ENGWEBO2DA", "GEN", 1)).thenReturn(envelope);

        mockMvc.perform(get("/api/v1/proxy/bible/timestamps/ENGWEBO2DA/GEN/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.data").isArray())
            .andExpect(jsonPath("$.data.data").isEmpty())
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    // ─── Validation failures (4 tests) ───────────────────────────────────

    @Test
    @DisplayName("GET /bibles with bad language code returns 400 INVALID_INPUT")
    void listBibles_badLanguage_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/proxy/bible/bibles").param("language", "INVALID"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("GET /filesets/{bad!!} returns 400 via @Pattern")
    void getFileset_badId_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/proxy/bible/filesets/bad!!"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("GET /filesets/{id}/{bookCode lowercase} returns 400")
    void getChapter_badBookCode_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/proxy/bible/filesets/ENGWEB/xyz/3"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("GET /filesets/{id}/{book}/{chapter out of range} returns 400")
    void getChapter_badChapter_returns400() throws Exception {
        // chapter = 0 violates @Min(1)
        mockMvc.perform(get("/api/v1/proxy/bible/filesets/ENGWEB/JHN/0"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));

        // chapter = 201 violates @Max(200)
        mockMvc.perform(get("/api/v1/proxy/bible/filesets/ENGWEB/JHN/201"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    // ─── Error-path mapping (2 tests) ────────────────────────────────────

    @Test
    @DisplayName("GET /filesets/{id}/{book}/{chapter} 404 returns NOT_FOUND with exact message")
    void getChapter_notFound_returns404() throws Exception {
        when(service.getChapter(anyString(), anyString(), anyInt()))
            .thenThrow(new FcbhNotFoundException("Audio not available for this chapter."));

        mockMvc.perform(get("/api/v1/proxy/bible/filesets/ENGWEB/PSA/151"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Audio not available for this chapter."))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("GET /filesets/{id}/{book}/{chapter} on upstream error returns 502 UPSTREAM_ERROR")
    void getChapter_upstreamError_returns502() throws Exception {
        when(service.getChapter(anyString(), anyString(), anyInt()))
            .thenThrow(new UpstreamException("FCBH service is temporarily unavailable. Please try again."));

        mockMvc.perform(get("/api/v1/proxy/bible/filesets/ENGWEB/JHN/3"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"))
            .andExpect(jsonPath("$.message").value("FCBH service is temporarily unavailable. Please try again."));
    }
}
