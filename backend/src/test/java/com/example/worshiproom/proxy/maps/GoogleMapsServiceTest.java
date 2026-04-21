package com.example.worshiproom.proxy.maps;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@DisplayName("GoogleMapsService")
class GoogleMapsServiceTest {

    private ProxyConfig config;
    private WebClient webClient;
    private GoogleMapsService service;

    @BeforeEach
    void setUp() {
        config = new ProxyConfig();
        config.getGoogleMaps().setApiKey("fake-test-key");
        webClient = mock(WebClient.class);
        // spy() wraps a real instance so we can stub the package-private call*
        // seams via doReturn() while the public methods' production logic runs.
        service = spy(new GoogleMapsService(config, webClient));
    }

    // ─── Search (8 tests) ────────────────────────────────────────────────

    @Test
    @DisplayName("search happy path returns places and nextPageToken")
    void search_happyPath_returnsPlacesAndPageToken() {
        Map<String, Object> place = Map.of("id", "ChIJ1");
        Map<String, Object> response = Map.of(
            "places", List.of(place),
            "nextPageToken", "nextTok"
        );
        doReturn(Mono.just(response)).when(service).callPlacesSearch(any());

        PlacesSearchResponse result = service.search(
            new PlacesSearchRequest(35.75, -86.93, 10, "church", null));

        assertThat(result.places()).hasSize(1);
        assertThat(result.places().get(0).get("id")).isEqualTo("ChIJ1");
        assertThat(result.nextPageToken()).isEqualTo("nextTok");
    }

    @Test
    @DisplayName("search with no places key returns empty list and null token")
    void search_emptyResults_returnsEmptyList() {
        doReturn(Mono.just(Map.<String, Object>of())).when(service).callPlacesSearch(any());

        PlacesSearchResponse result = service.search(
            new PlacesSearchRequest(35.75, -86.93, 10, "church", null));

        assertThat(result.places()).isEmpty();
        assertThat(result.nextPageToken()).isNull();
    }

    @Test
    @DisplayName("search cache hit on second call with same params")
    void search_cacheHitOnSecondCall() {
        doReturn(Mono.just(Map.<String, Object>of("places", List.of())))
            .when(service).callPlacesSearch(any());

        PlacesSearchRequest req = new PlacesSearchRequest(35.75, -86.93, 10, "church", null);
        service.search(req);
        service.search(req);

        verify(service, times(1)).callPlacesSearch(any());
    }

    @Test
    @DisplayName("search cache miss on different keyword")
    void search_cacheMissOnDifferentKeyword() {
        doReturn(Mono.just(Map.<String, Object>of("places", List.of())))
            .when(service).callPlacesSearch(any());

        service.search(new PlacesSearchRequest(35.75, -86.93, 10, "church", null));
        service.search(new PlacesSearchRequest(35.75, -86.93, 10, "counselor", null));

        verify(service, times(2)).callPlacesSearch(any());
    }

    @Test
    @DisplayName("search pageToken changes cache key")
    void search_pageTokenChangesCacheKey() {
        doReturn(Mono.just(Map.<String, Object>of("places", List.of())))
            .when(service).callPlacesSearch(any());

        service.search(new PlacesSearchRequest(35.75, -86.93, 10, "church", null));
        service.search(new PlacesSearchRequest(35.75, -86.93, 10, "church", "tokA"));

        verify(service, times(2)).callPlacesSearch(any());
    }

    @Test
    @DisplayName("search 4xx error maps to UpstreamException (no leak)")
    void search_4xxErrorMapsToUpstream() {
        WebClientResponseException ex = WebClientResponseException.create(
            403, "Forbidden", null, "{\"error\":\"INTERNAL_GOOGLE_DETAILS_DO_NOT_LEAK\"}".getBytes(), null);
        doReturn(Mono.error(ex)).when(service).callPlacesSearch(any());

        assertThatThrownBy(() -> service.search(new PlacesSearchRequest(35.75, -86.93, 10, "church", null)))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("Maps service is temporarily unavailable. Please try again.")
            .extracting(Throwable::getMessage, org.assertj.core.api.InstanceOfAssertFactories.STRING)
            .doesNotContain("INTERNAL_GOOGLE_DETAILS_DO_NOT_LEAK")
            .doesNotContain("403");
    }

    @Test
    @DisplayName("search 5xx error maps to UpstreamException")
    void search_5xxErrorMapsToUpstream() {
        WebClientResponseException ex = WebClientResponseException.create(
            500, "Internal Server Error", null, new byte[0], null);
        doReturn(Mono.error(ex)).when(service).callPlacesSearch(any());

        assertThatThrownBy(() -> service.search(new PlacesSearchRequest(35.75, -86.93, 10, "church", null)))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("Maps service is temporarily unavailable. Please try again.");
    }

    @Test
    @DisplayName("search timeout maps to UpstreamTimeoutException")
    void search_timeoutMapsToUpstreamTimeout() {
        RuntimeException wrappedTimeout = new RuntimeException("wrapper", new TimeoutException("inner timeout"));
        doReturn(Mono.error(wrappedTimeout)).when(service).callPlacesSearch(any());

        assertThatThrownBy(() -> service.search(new PlacesSearchRequest(35.75, -86.93, 10, "church", null)))
            .isInstanceOf(UpstreamTimeoutException.class)
            .hasMessage("Maps service timed out. Please try again.");
    }

    // ─── Geocode (6 tests) ───────────────────────────────────────────────

    @Test
    @DisplayName("geocode happy path returns coords")
    void geocode_happyPath_returnsCoords() {
        Map<String, Object> location = Map.of("lat", 35.7501, "lng", -86.9303);
        Map<String, Object> geometry = Map.of("location", location);
        Map<String, Object> result = Map.of("geometry", geometry);
        Map<String, Object> response = Map.of("status", "OK", "results", List.of(result));
        doReturn(Mono.just(response)).when(service).callGeocode(anyString());

        GeocodeResponse r = service.geocode("Spring Hill, TN");

        assertThat(r.lat()).isEqualTo(35.7501);
        assertThat(r.lng()).isEqualTo(-86.9303);
    }

    @Test
    @DisplayName("geocode ZERO_RESULTS returns NO_RESULT")
    void geocode_zeroResults_returnsNoResult() {
        doReturn(Mono.just(Map.<String, Object>of("status", "ZERO_RESULTS")))
            .when(service).callGeocode(anyString());

        GeocodeResponse r = service.geocode("nonexistent place xyzzy");

        assertThat(r.lat()).isNull();
        assertThat(r.lng()).isNull();
    }

    @Test
    @DisplayName("geocode OK with empty results returns NO_RESULT")
    void geocode_emptyResults_returnsNoResult() {
        doReturn(Mono.just(Map.<String, Object>of("status", "OK", "results", List.of())))
            .when(service).callGeocode(anyString());

        GeocodeResponse r = service.geocode("q");

        assertThat(r.lat()).isNull();
        assertThat(r.lng()).isNull();
    }

    @Test
    @DisplayName("geocode OVER_QUERY_LIMIT throws UpstreamException")
    void geocode_overQueryLimit_throwsUpstream() {
        doReturn(Mono.just(Map.<String, Object>of("status", "OVER_QUERY_LIMIT")))
            .when(service).callGeocode(anyString());

        assertThatThrownBy(() -> service.geocode("q"))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("Maps service rejected");
    }

    @Test
    @DisplayName("geocode cache hit on second call with same query")
    void geocode_cacheHitOnSecondCall() {
        doReturn(Mono.just(Map.<String, Object>of("status", "ZERO_RESULTS")))
            .when(service).callGeocode(anyString());

        service.geocode("Nashville");
        service.geocode("Nashville");

        verify(service, times(1)).callGeocode(anyString());
    }

    @Test
    @DisplayName("geocode negative result is cached")
    void geocode_negativeResultIsCached() {
        doReturn(Mono.just(Map.<String, Object>of("status", "ZERO_RESULTS")))
            .when(service).callGeocode(anyString());

        GeocodeResponse a = service.geocode("typo-location-xyzzy");
        GeocodeResponse b = service.geocode("typo-location-xyzzy");

        assertThat(a).isSameAs(GeocodeResponse.NO_RESULT);
        assertThat(b).isSameAs(GeocodeResponse.NO_RESULT);
        verify(service, times(1)).callGeocode(anyString());
    }

    // ─── Photo (6 tests) ─────────────────────────────────────────────────

    @Test
    @DisplayName("fetchPhoto happy path returns bytes and content type")
    void fetchPhoto_happyPath_returnsBytes() {
        byte[] bytes = new byte[] {1, 2, 3, 4};
        doReturn(Mono.just(new GoogleMapsService.PhotoBytes(bytes, MediaType.IMAGE_JPEG)))
            .when(service).callPlacePhoto(anyString());

        GoogleMapsService.PhotoBytes result = service.fetchPhoto("places/abc123/photos/xyz456");

        assertThat(result.bytes()).isEqualTo(bytes);
        assertThat(result.contentType()).isEqualTo(MediaType.IMAGE_JPEG);
    }

    @Test
    @DisplayName("fetchPhoto SSRF: path traversal rejected")
    void fetchPhoto_invalidNameRejected() {
        assertThatThrownBy(() -> service.fetchPhoto("../etc/passwd"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid photo name format");
    }

    @Test
    @DisplayName("fetchPhoto SSRF: protocol injection rejected")
    void fetchPhoto_protocolInjectionRejected() {
        assertThatThrownBy(() -> service.fetchPhoto("https://evil.com/x"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("fetchPhoto SSRF: extra path segment rejected")
    void fetchPhoto_extraSlashRejected() {
        assertThatThrownBy(() -> service.fetchPhoto("places/x/photos/y/extra"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("fetchPhoto cache hit on second call")
    void fetchPhoto_cacheHitOnSecondCall() {
        byte[] bytes = new byte[] {1, 2, 3};
        doReturn(Mono.just(new GoogleMapsService.PhotoBytes(bytes, MediaType.IMAGE_JPEG)))
            .when(service).callPlacePhoto(anyString());

        service.fetchPhoto("places/abc/photos/xyz");
        service.fetchPhoto("places/abc/photos/xyz");

        verify(service, times(1)).callPlacePhoto(anyString());
    }

    @Test
    @DisplayName("fetchPhoto upstream 502 maps to UpstreamException")
    void fetchPhoto_4xxMapsToUpstream() {
        WebClientResponseException ex = WebClientResponseException.create(
            502, "Bad Gateway", null, new byte[0], null);
        doReturn(Mono.error(ex)).when(service).callPlacePhoto(anyString());

        assertThatThrownBy(() -> service.fetchPhoto("places/abc/photos/xyz"))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("Maps service is temporarily unavailable. Please try again.");
    }

    @Test
    @DisplayName("fetchPhoto empty body maps to UpstreamException")
    void fetchPhoto_emptyBodyMapsToUpstream() {
        // When the upstream returns a 200 with zero bytes, callPlacePhoto's
        // own body-length check would throw UpstreamException. Simulate the
        // same post-callPlacePhoto state by having the seam emit that typed
        // exception directly. The outer catch (UpstreamException | ...)
        // guard must preserve the specific message rather than re-wrapping.
        doReturn(Mono.<GoogleMapsService.PhotoBytes>error(
            new UpstreamException("Maps service returned empty photo body.")))
            .when(service).callPlacePhoto(anyString());

        assertThatThrownBy(() -> service.fetchPhoto("places/abc/photos/xyz"))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("Maps service returned empty photo body.");
    }

    // ─── Configuration boundary (2 tests) ────────────────────────────────

    @Test
    @DisplayName("unconfigured key throws UpstreamException with user-safe message")
    void nullClientConfig_throwsUpstream() {
        ProxyConfig emptyConfig = new ProxyConfig();
        GoogleMapsService unconfiguredService = new GoogleMapsService(emptyConfig, webClient);

        assertThatThrownBy(() -> unconfiguredService.search(
            new PlacesSearchRequest(35.75, -86.93, 10, "church", null)))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("Maps service is not configured on the server.");

        assertThatThrownBy(() -> unconfiguredService.geocode("q"))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("Maps service is not configured on the server.");

        assertThatThrownBy(() -> unconfiguredService.fetchPhoto("places/a/photos/b"))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("Maps service is not configured on the server.");

        assertThat(unconfiguredService.isConfigured()).isFalse();
    }

    @Test
    @DisplayName("no upstream error text leaks across all error paths")
    void noLeakOfUpstreamErrorText() {
        // Search: 4xx with secret-y body
        WebClientResponseException http = WebClientResponseException.create(
            403, "Forbidden", null,
            "AIzaSecretABC places.googleapis.com key=XYZ".getBytes(), null);
        doReturn(Mono.error(http)).when(service).callPlacesSearch(any());

        try {
            service.search(new PlacesSearchRequest(35.75, -86.93, 10, "church", null));
        } catch (UpstreamException ex) {
            assertThat(ex.getMessage())
                .doesNotContain("AIza")
                .doesNotContain("google")
                .doesNotContain("places.googleapis")
                .doesNotContain("key=")
                .isEqualTo("Maps service is temporarily unavailable. Please try again.");
        }

        // Geocode: 5xx
        WebClientResponseException http5xx = WebClientResponseException.create(
            500, "err", null, "AIzaLeak".getBytes(), null);
        doReturn(Mono.error(http5xx)).when(service).callGeocode(anyString());
        try {
            service.geocode("q");
        } catch (UpstreamException ex) {
            assertThat(ex.getMessage()).doesNotContain("AIza");
        }

        // Photo: generic runtime error
        doReturn(Mono.error(new RuntimeException("AIzaLeakInsideRuntime"))).when(service).callPlacePhoto(anyString());
        try {
            service.fetchPhoto("places/a/photos/b");
        } catch (UpstreamException ex) {
            assertThat(ex.getMessage()).doesNotContain("AIza");
        }
    }
}
