package com.worshiproom.proxy.bible;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@DisplayName("FcbhService")
class FcbhServiceTest {

    private ProxyConfig config;
    private WebClient webClient;
    private FcbhService service;
    private static final String FAKE_API_KEY = "fake-test-fcbh-key-aiza-lookalike-ABC123";

    @BeforeEach
    void setUp() {
        config = new ProxyConfig();
        config.getFcbh().setApiKey(FAKE_API_KEY);
        webClient = mock(WebClient.class);
        // spy() wraps a real instance so we can stub the package-private call*
        // seams via doReturn() while the public methods' production logic runs.
        service = spy(new FcbhService(config, webClient));
    }

    // ─── Configuration (1 test) ──────────────────────────────────────────

    @Test
    @DisplayName("all endpoints throw UpstreamException when FCBH_API_KEY is missing")
    void allEndpoints_throwUpstreamExceptionWhenKeyMissing() {
        config.getFcbh().setApiKey("");
        // Rebuild the service so the startup log/warn path exercises the empty key.
        FcbhService unconfigured = new FcbhService(config, webClient);

        assertThatThrownBy(() -> unconfigured.listBibles("eng"))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
        assertThatThrownBy(() -> unconfigured.getFileset("EN1WEBN2DA"))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
        assertThatThrownBy(() -> unconfigured.getChapter("EN1WEBN2DA", "JHN", 3))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
        assertThatThrownBy(() -> unconfigured.getTimestamps("EN1WEBN2DA", "JHN", 3))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
    }

    // ─── Happy path (4 tests) ────────────────────────────────────────────

    @Test
    @DisplayName("listBibles returns DBP envelope unchanged")
    void listBibles_returnsDbpEnvelope() {
        Map<String, Object> envelope = Map.of(
            "data", List.of(Map.of("id", "ENGWWH", "name", "World English Bible")),
            "meta", Map.of("pagination", Map.of("total", 1)));
        doReturn(Mono.just(envelope)).when(service).callBibles("eng");

        Map<String, Object> result = service.listBibles("eng");

        assertThat(result).isEqualTo(envelope);
    }

    @Test
    @DisplayName("getFileset returns DBP envelope unchanged")
    void getFileset_returnsDbpEnvelope() {
        Map<String, Object> envelope = Map.of(
            "data", List.of(Map.of("id", "EN1WEBN2DA", "book_id", "JHN")),
            "meta", Map.of());
        doReturn(Mono.just(envelope)).when(service).callFileset("EN1WEBN2DA");

        Map<String, Object> result = service.getFileset("EN1WEBN2DA");

        assertThat(result).isEqualTo(envelope);
    }

    @Test
    @DisplayName("getChapter returns DBP envelope with signed CloudFront path")
    void getChapter_returnsDbpEnvelope() {
        Map<String, Object> envelope = Map.of(
            "data", List.of(Map.of(
                "book_id", "JHN",
                "chapter_start", 3,
                "path", "https://d1gd73roq7kqw6.cloudfront.net/.../john3.mp3?Signature=sig",
                "duration", 321,
                "filesize_in_bytes", 2560000)),
            "meta", Map.of());
        doReturn(Mono.just(envelope)).when(service).callChapter("EN1WEBN2DA", "JHN", 3);

        Map<String, Object> result = service.getChapter("EN1WEBN2DA", "JHN", 3);

        assertThat(result).isEqualTo(envelope);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> data = (List<Map<String, Object>>) result.get("data");
        assertThat((String) data.get(0).get("path")).startsWith("https://");
    }

    @Test
    @DisplayName("getTimestamps returns DBP envelope unchanged")
    void getTimestamps_returnsDbpEnvelope() {
        Map<String, Object> envelope = Map.of(
            "data", List.of(
                Map.of("book", "JHN", "chapter", "3", "verse_start", "1", "timestamp", 0.0),
                Map.of("book", "JHN", "chapter", "3", "verse_start", "2", "timestamp", 5.2)),
            "meta", Map.of());
        doReturn(Mono.just(envelope)).when(service).callTimestamps("EN1WEBN2DA", "JHN", 3);

        Map<String, Object> result = service.getTimestamps("EN1WEBN2DA", "JHN", 3);

        assertThat(result).isEqualTo(envelope);
    }

    // ─── Caching (4 tests) ───────────────────────────────────────────────

    @Test
    @DisplayName("listBibles caches repeat calls")
    void listBibles_cachesRepeatCalls() {
        Map<String, Object> envelope = Map.of("data", List.of(), "meta", Map.of());
        doReturn(Mono.just(envelope)).when(service).callBibles("eng");

        service.listBibles("eng");
        service.listBibles("eng");

        verify(service, times(1)).callBibles("eng");
    }

    @Test
    @DisplayName("getFileset caches repeat calls")
    void getFileset_cachesRepeatCalls() {
        Map<String, Object> envelope = Map.of("data", List.of(), "meta", Map.of());
        doReturn(Mono.just(envelope)).when(service).callFileset("EN1WEBN2DA");

        service.getFileset("EN1WEBN2DA");
        service.getFileset("EN1WEBN2DA");

        verify(service, times(1)).callFileset("EN1WEBN2DA");
    }

    @Test
    @DisplayName("getChapter caches repeat calls (case-insensitively)")
    void getChapter_cachesRepeatCalls() {
        Map<String, Object> envelope = Map.of(
            "data", List.of(Map.of("book_id", "JHN", "path", "https://cdn/john3.mp3")),
            "meta", Map.of());
        doReturn(Mono.just(envelope)).when(service).callChapter(anyString(), anyString(), anyInt());

        service.getChapter("EN1WEBN2DA", "JHN", 3);
        service.getChapter("EN1WEBN2DA", "JHN", 3);
        // Different case — same cache key (tests FcbhCacheKeys.chapterKey normalization)
        service.getChapter("en1webn2da", "jhn", 3);

        verify(service, times(1)).callChapter(anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("getTimestamps does NOT cache — every call hits upstream")
    void getTimestamps_doesNotCache() {
        Map<String, Object> envelope = Map.of("data", List.of(), "meta", Map.of());
        doReturn(Mono.just(envelope)).when(service).callTimestamps("EN1WEBN2DA", "JHN", 3);

        service.getTimestamps("EN1WEBN2DA", "JHN", 3);
        service.getTimestamps("EN1WEBN2DA", "JHN", 3);

        verify(service, times(2)).callTimestamps("EN1WEBN2DA", "JHN", 3);
    }

    // ─── Error mapping (5 tests) ─────────────────────────────────────────

    @Test
    @DisplayName("getChapter 404 maps to FcbhNotFoundException (not UpstreamException)")
    void getChapter_404mapsTo_FcbhNotFoundException() {
        WebClientResponseException upstream = WebClientResponseException.create(
            404, "Not Found", HttpHeaders.EMPTY, new byte[0], null);
        doReturn(Mono.error(upstream)).when(service).callChapter(anyString(), anyString(), anyInt());

        assertThatThrownBy(() -> service.getChapter("EN1WEBO2DA", "PSA", 151))
            .isInstanceOf(FcbhNotFoundException.class)
            .hasMessage("Audio not available for this chapter.")
            .isNotInstanceOf(UpstreamException.class);
    }

    @Test
    @DisplayName("getChapter 500 maps to UpstreamException")
    void getChapter_500mapsToUpstreamException() {
        WebClientResponseException upstream = WebClientResponseException.create(
            500, "Internal Server Error", HttpHeaders.EMPTY, new byte[0], null);
        doReturn(Mono.error(upstream)).when(service).callChapter(anyString(), anyString(), anyInt());

        assertThatThrownBy(() -> service.getChapter("EN1WEBN2DA", "JHN", 3))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("temporarily unavailable")
            .isNotInstanceOf(FcbhNotFoundException.class);
    }

    @Test
    @DisplayName("getChapter timeout maps to UpstreamTimeoutException")
    void getChapter_timeoutMapsToUpstreamTimeout() {
        RuntimeException wrappedTimeout = new RuntimeException("wrapper", new TimeoutException("inner timeout"));
        doReturn(Mono.error(wrappedTimeout)).when(service).callChapter(anyString(), anyString(), anyInt());

        assertThatThrownBy(() -> service.getChapter("EN1WEBN2DA", "JHN", 3))
            .isInstanceOf(UpstreamTimeoutException.class)
            .hasMessageContaining("timed out");
    }

    @Test
    @DisplayName("getChapter network error maps to UpstreamException")
    void getChapter_networkErrorMapsToUpstream() {
        WebClientRequestException network = new WebClientRequestException(
            new UnknownHostException("4.dbt.io"), HttpMethod.GET,
            URI.create("https://4.dbt.io/api/bibles/filesets/EN1WEBN2DA/JHN/3"),
            HttpHeaders.EMPTY);
        doReturn(Mono.error(network)).when(service).callChapter(anyString(), anyString(), anyInt());

        assertThatThrownBy(() -> service.getChapter("EN1WEBN2DA", "JHN", 3))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("temporarily unavailable");
    }

    @Test
    @DisplayName("no leak of API key in exception messages across error paths")
    void noLeakOfApiKeyInExceptionMessages() {
        // Trigger each error path and assert the thrown exception's message chain
        // does NOT contain the API key literal or key=... query-string fragments.
        WebClientResponseException upstream500 = WebClientResponseException.create(
            500, "body-with-" + FAKE_API_KEY, HttpHeaders.EMPTY,
            ("some body that has " + FAKE_API_KEY + " in it").getBytes(), null);
        doReturn(Mono.error(upstream500)).when(service).callChapter(anyString(), anyString(), anyInt());

        Throwable thrown = null;
        try {
            service.getChapter("EN1WEBN2DA", "JHN", 3);
        } catch (RuntimeException ex) {
            thrown = ex;
        }
        assertThat(thrown).isNotNull();
        // The thrown exception's message is user-safe.
        assertThat(thrown.getMessage().toLowerCase()).doesNotContain("aiza");
        assertThat(thrown.getMessage().toLowerCase()).doesNotContain("key=");
        assertThat(thrown.getMessage()).doesNotContain(FAKE_API_KEY);
        // Message is exactly the user-safe string — nothing else.
        assertThat(thrown.getMessage()).isEqualTo("FCBH service is temporarily unavailable. Please try again.");
    }
}
