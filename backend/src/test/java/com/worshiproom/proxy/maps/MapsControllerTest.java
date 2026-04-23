package com.worshiproom.proxy.maps;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.ProxyExceptionHandler;
import com.worshiproom.proxy.common.UpstreamException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = MapsController.class, excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import({ProxyExceptionHandler.class, ProxyConfig.class})
@DisplayName("MapsController")
class MapsControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GoogleMapsService service;

    // ─── Places search (5 tests) ─────────────────────────────────────────

    @Test
    @DisplayName("POST /places-search happy path returns 200 with ProxyResponse body")
    void placesSearch_happyPath_returns200WithBody() throws Exception {
        when(service.search(any())).thenReturn(
            new PlacesSearchResponse(List.of(Map.of("id", "ChIJ1")), "nextTok"));

        // Map.of() rejects null values; omit pageToken entirely (null/missing are
        // equivalent per PlacesSearchRequest — null means "first page").
        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 35.75, "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.places[0].id").value("ChIJ1"))
            .andExpect(jsonPath("$.data.nextPageToken").value("nextTok"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("POST /places-search missing lat returns 400 INVALID_INPUT")
    void placesSearch_missingLat_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("POST /places-search invalid lat range returns 400")
    void placesSearch_invalidLatRange_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 100.0, "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("POST /places-search radiusMiles > 50 returns 400")
    void placesSearch_invalidRadius_returns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 35.75, "lng", -86.93, "radiusMiles", 51, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("POST /places-search service throws UpstreamException → 502")
    void placesSearch_serviceThrowsUpstream_returns502() throws Exception {
        when(service.search(any())).thenThrow(new UpstreamException("Maps service is temporarily unavailable."));

        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 35.75, "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"));
    }

    // ─── Geocode (3 tests) ───────────────────────────────────────────────

    @Test
    @DisplayName("GET /geocode happy path returns 200 with coords")
    void geocode_happyPath_returns200WithCoords() throws Exception {
        when(service.geocode(anyString())).thenReturn(new GeocodeResponse(35.75, -86.93));

        mockMvc.perform(get("/api/v1/proxy/maps/geocode").param("query", "Spring Hill, TN"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.lat").value(35.75))
            .andExpect(jsonPath("$.data.lng").value(-86.93))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("GET /geocode missing query param returns 400")
    void geocode_missingQuery_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/proxy/maps/geocode"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("GET /geocode returns 200 with null pair for no-result")
    void geocode_emptyResult_returns200WithNulls() throws Exception {
        when(service.geocode(anyString())).thenReturn(GeocodeResponse.NO_RESULT);

        // Null fields are omitted from the JSON body due to the global
        // spring.jackson.default-property-inclusion=non_null setting. Frontend
        // treats missing and null identically via `envelope.data.lat == null`
        // loose equality, so the omission is safe. Test asserts absence, not null.
        mockMvc.perform(get("/api/v1/proxy/maps/geocode").param("query", "nowhere"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").exists())
            .andExpect(jsonPath("$.data.lat").doesNotExist())
            .andExpect(jsonPath("$.data.lng").doesNotExist());
    }

    // ─── Place photo (5 tests) ───────────────────────────────────────────

    @Test
    @DisplayName("GET /place-photo happy path returns image bytes with Cache-Control")
    void placePhoto_happyPath_returns200WithImageBytes() throws Exception {
        byte[] bytes = new byte[] {1, 2, 3, 4};
        when(service.fetchPhoto(anyString())).thenReturn(
            new GoogleMapsService.PhotoBytes(bytes, MediaType.IMAGE_JPEG));

        mockMvc.perform(get("/api/v1/proxy/maps/place-photo")
                .param("name", "places/abc/photos/xyz"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.IMAGE_JPEG))
            .andExpect(header().string("Cache-Control", "public, max-age=86400, immutable"))
            .andExpect(content().bytes(bytes));
    }

    @Test
    @DisplayName("GET /place-photo invalid name format returns 400 (NOT image bytes)")
    void placePhoto_invalidNameFormat_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/proxy/maps/place-photo")
                .param("name", "../etc/passwd"))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("GET /place-photo missing name returns 400")
    void placePhoto_missingName_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/proxy/maps/place-photo"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("GET /place-photo service throws UpstreamException → 502 JSON error (not bytes)")
    void placePhoto_serviceThrowsUpstream_returns502JsonError() throws Exception {
        when(service.fetchPhoto(anyString())).thenThrow(new UpstreamException("Maps service unavailable."));

        mockMvc.perform(get("/api/v1/proxy/maps/place-photo")
                .param("name", "places/abc/photos/xyz"))
            .andExpect(status().isBadGateway())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"));
    }

    @Test
    @DisplayName("GET /place-photo success response includes X-Request-Id header")
    void placePhoto_xRequestIdHeaderPresent() throws Exception {
        when(service.fetchPhoto(anyString())).thenReturn(
            new GoogleMapsService.PhotoBytes(new byte[] {1}, MediaType.IMAGE_JPEG));

        mockMvc.perform(get("/api/v1/proxy/maps/place-photo")
                .param("name", "places/a/photos/b"))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"));
    }
}
