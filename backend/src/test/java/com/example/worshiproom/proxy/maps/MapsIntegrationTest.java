package com.example.worshiproom.proxy.maps;

import com.example.worshiproom.proxy.common.UpstreamException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Maps proxy integration")
class MapsIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private GoogleMapsService service;

    @Test
    @DisplayName("Full lifecycle: places-search returns expected headers and body envelope")
    void fullLifecycle_placesSearch_returnsExpectedHeaders() throws Exception {
        when(service.search(any())).thenReturn(
            new PlacesSearchResponse(List.of(Map.of("id", "ChIJ1")), "tok"));

        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 35.75, "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"))
            .andExpect(jsonPath("$.data.places[0].id").value("ChIJ1"))
            .andExpect(jsonPath("$.data.nextPageToken").value("tok"))
            .andExpect(jsonPath("$.meta.requestId").exists());
    }

    @Test
    @DisplayName("Full lifecycle: geocode propagates client-supplied X-Request-Id")
    void fullLifecycle_geocode_propagatesRequestId() throws Exception {
        when(service.geocode(anyString())).thenReturn(new GeocodeResponse(35.75, -86.93));

        mockMvc.perform(get("/api/v1/proxy/maps/geocode")
                .header("X-Request-Id", "integration-req-id-777")
                .param("query", "Spring Hill, TN"))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-Id", "integration-req-id-777"))
            .andExpect(jsonPath("$.meta.requestId").value("integration-req-id-777"));
    }

    @Test
    @DisplayName("Full lifecycle: place-photo streams bytes with correct headers")
    void fullLifecycle_placePhoto_streamsBytesWithCorrectHeaders() throws Exception {
        byte[] bytes = new byte[] {10, 20, 30, 40, 50};
        when(service.fetchPhoto(anyString())).thenReturn(
            new GoogleMapsService.PhotoBytes(bytes, MediaType.IMAGE_JPEG));

        mockMvc.perform(get("/api/v1/proxy/maps/place-photo")
                .param("name", "places/abc/photos/xyz"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.IMAGE_JPEG))
            .andExpect(header().string("Cache-Control", "public, max-age=86400, immutable"))
            .andExpect(header().exists("X-Request-Id"))
            .andExpect(content().bytes(bytes));
    }

    @Test
    @DisplayName("Full lifecycle: invalid input returns ProxyError shape")
    void fullLifecycle_invalidInput_returnsProxyErrorShape() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 999.0, "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
            .andExpect(jsonPath("$.message").exists())
            .andExpect(jsonPath("$.requestId").exists())
            .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("Full lifecycle: unconfigured / unreachable returns 502 UPSTREAM_ERROR")
    void fullLifecycle_placesSearchUnconfiguredReturns502() throws Exception {
        when(service.search(any())).thenThrow(
            new UpstreamException("Maps service is not configured on the server."));

        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 35.75, "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.code").value("UPSTREAM_ERROR"))
            .andExpect(jsonPath("$.message").value("Maps service is not configured on the server."));
    }

    @Test
    @DisplayName("Full lifecycle: upstream error cause text never leaks to response body")
    void fullLifecycle_noUpstreamErrorTextLeaks() throws Exception {
        // Service throws generic-message UpstreamException with a secret-bearing cause.
        // The serialized response must contain only the generic message — the cause's
        // toString() must not appear.
        when(service.search(any())).thenThrow(
            new UpstreamException(
                "Maps service is temporarily unavailable. Please try again.",
                new RuntimeException("AIzaSecretLeakABC internal-google-error places.googleapis.com")));

        String body = objectMapper.writeValueAsString(Map.of(
            "lat", 35.75, "lng", -86.93, "radiusMiles", 10, "keyword", "church"));

        mockMvc.perform(post("/api/v1/proxy/maps/places-search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.message", not(containsString("AIza"))))
            .andExpect(jsonPath("$.message", not(containsString("google"))))
            .andExpect(jsonPath("$.message", not(containsString("places.googleapis"))));
    }
}
