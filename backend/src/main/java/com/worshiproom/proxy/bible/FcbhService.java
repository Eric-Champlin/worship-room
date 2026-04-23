package com.worshiproom.proxy.bible;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.ProxyException;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeoutException;

/**
 * Server-side FCBH Digital Bible Platform v4 caller. Wraps WebClient calls to
 * four upstream endpoints — bibles list, fileset catalog, per-chapter audio
 * URL lookup, and BB-44 verse timestamps — and maps SDK/HTTP errors to typed
 * proxy exceptions from {@code com.worshiproom.proxy.common}, plus the
 * FCBH-specific {@link FcbhNotFoundException} for upstream 404s.
 *
 * <p>The FCBH API key is never exposed to the frontend; it lives only on the
 * server under {@code proxy.fcbh.api-key}. On a missing/empty key, every call
 * throws {@link UpstreamException} with a user-safe message.
 *
 * <p>Three bounded Caffeine caches protect the shared DBP quota (1500/window
 * per key) across users (see {@code 02-security.md} § "BOUNDED EXTERNAL-INPUT
 * CACHES"):
 * <ul>
 *   <li>{@code biblesCache} — 10 entries, 7d TTL</li>
 *   <li>{@code filesetCache} — 20 entries, 7d TTL</li>
 *   <li>{@code chapterCache} — 2000 entries, 6h TTL (stays well under the ~15h
 *       CloudFront signature expiry on the cached {@code path} field)</li>
 * </ul>
 *
 * <p>Timestamps are NOT cached (per spec AD #3 — BB-44 read-along is low-volume
 * opt-in; marginal benefit).
 *
 * <p>The four {@code call*} methods are package-private test seams (D2b
 * pattern from Spec 2). Tests use {@code Mockito.spy()} + {@code doReturn()}
 * on these methods to stub the upstream boundary without mocking WebClient's
 * fluent builder.
 */
@Service
public class FcbhService {

    private static final Logger log = LoggerFactory.getLogger(FcbhService.class);
    private static final String DBP_BASE_URL = "https://4.dbt.io/api";
    private static final Duration UPSTREAM_TIMEOUT = Duration.ofSeconds(10);

    private final ProxyConfig proxyConfig;
    private final WebClient webClient;

    private final Cache<String, Map<String, Object>> biblesCache = Caffeine.newBuilder()
        .maximumSize(10)
        .expireAfterWrite(Duration.ofDays(7))
        .build();

    private final Cache<String, Map<String, Object>> filesetCache = Caffeine.newBuilder()
        .maximumSize(20)
        .expireAfterWrite(Duration.ofDays(7))
        .build();

    private final Cache<String, Map<String, Object>> chapterCache = Caffeine.newBuilder()
        .maximumSize(2000)
        .expireAfterWrite(Duration.ofHours(6))
        .build();

    public FcbhService(ProxyConfig proxyConfig, WebClient proxyWebClient) {
        this.proxyConfig = proxyConfig;
        this.webClient = proxyWebClient;
        if (!proxyConfig.getFcbh().isConfigured()) {
            log.warn("FCBH_API_KEY is not configured. /api/v1/proxy/bible/* endpoints "
                + "will return 502 UPSTREAM_ERROR until it is set.");
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────

    public Map<String, Object> listBibles(String language) {
        if (!proxyConfig.getFcbh().isConfigured()) {
            throw new UpstreamException("FCBH audio service is not configured on the server.");
        }
        String key = FcbhCacheKeys.biblesKey(language);
        Map<String, Object> cached = biblesCache.getIfPresent(key);
        if (cached != null) {
            log.debug("FCBH bibles cache hit language={}", language);
            return cached;
        }
        try {
            Map<String, Object> response = callBibles(language).block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("FCBH service returned no response.");
            }
            biblesCache.put(key, response);
            log.info("FCBH bibles fetched language={}", language);
            return response;
        } catch (ProxyException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw mapWebClientError("bibles", ex);
        }
    }

    public Map<String, Object> getFileset(String filesetId) {
        if (!proxyConfig.getFcbh().isConfigured()) {
            throw new UpstreamException("FCBH audio service is not configured on the server.");
        }
        String key = FcbhCacheKeys.filesetKey(filesetId);
        Map<String, Object> cached = filesetCache.getIfPresent(key);
        if (cached != null) {
            log.debug("FCBH fileset cache hit filesetId={}", filesetId);
            return cached;
        }
        try {
            Map<String, Object> response = callFileset(filesetId).block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("FCBH service returned no response.");
            }
            filesetCache.put(key, response);
            log.info("FCBH fileset fetched filesetId={}", filesetId);
            return response;
        } catch (ProxyException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw mapWebClientError("fileset", ex);
        }
    }

    public Map<String, Object> getChapter(String filesetId, String bookCode, int chapter) {
        if (!proxyConfig.getFcbh().isConfigured()) {
            throw new UpstreamException("FCBH audio service is not configured on the server.");
        }
        String key = FcbhCacheKeys.chapterKey(filesetId, bookCode, chapter);
        Map<String, Object> cached = chapterCache.getIfPresent(key);
        if (cached != null) {
            log.debug("FCBH chapter cache hit filesetId={} bookCode={} chapter={}",
                filesetId, bookCode, chapter);
            return cached;
        }
        try {
            Map<String, Object> response = callChapter(filesetId, bookCode, chapter).block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("FCBH service returned no response.");
            }
            chapterCache.put(key, response);
            log.info("FCBH chapter fetched filesetId={} bookCode={} chapter={}",
                filesetId, bookCode, chapter);
            return response;
        } catch (ProxyException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw mapWebClientError("chapter", ex);
        }
    }

    public Map<String, Object> getTimestamps(String filesetId, String bookCode, int chapter) {
        if (!proxyConfig.getFcbh().isConfigured()) {
            throw new UpstreamException("FCBH audio service is not configured on the server.");
        }
        try {
            Map<String, Object> response = callTimestamps(filesetId, bookCode, chapter).block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("FCBH service returned no response.");
            }
            log.info("FCBH timestamps fetched filesetId={} bookCode={} chapter={}",
                filesetId, bookCode, chapter);
            return response;
        } catch (ProxyException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw mapWebClientError("timestamps", ex);
        }
    }

    // ─── Package-private test seams (D2b pattern from Spec 2) ────────────

    Mono<Map<String, Object>> callBibles(String language) {
        String apiKey = proxyConfig.getFcbh().getApiKey();
        return webClient.get()
            .uri(DBP_BASE_URL + "/bibles?language_code={lang}&v=4&key={k}", language, apiKey)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    Mono<Map<String, Object>> callFileset(String filesetId) {
        String apiKey = proxyConfig.getFcbh().getApiKey();
        return webClient.get()
            .uri(DBP_BASE_URL + "/bibles/filesets/{fs}?v=4&key={k}", filesetId, apiKey)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    Mono<Map<String, Object>> callChapter(String filesetId, String bookCode, int chapter) {
        String apiKey = proxyConfig.getFcbh().getApiKey();
        return webClient.get()
            .uri(DBP_BASE_URL + "/bibles/filesets/{fs}/{bk}/{ch}?v=4&key={k}",
                filesetId, bookCode, chapter, apiKey)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    Mono<Map<String, Object>> callTimestamps(String filesetId, String bookCode, int chapter) {
        String apiKey = proxyConfig.getFcbh().getApiKey();
        return webClient.get()
            .uri(DBP_BASE_URL + "/timestamps/{fs}/{bk}/{ch}?v=4&key={k}",
                filesetId, bookCode, chapter, apiKey)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    // ─── Error mapping (chokepoint — see 02-security.md § "Never Leak Upstream Error Text") ─

    /**
     * Maps WebClient runtime errors to our typed ProxyException hierarchy.
     *
     * <p>Upstream 404 → {@link FcbhNotFoundException} (HTTP 404 NOT_FOUND) —
     * deliberately distinct from UpstreamException so the frontend's
     * AudioPlayButton visibility logic preserves the "hide on no-audio"
     * silent-fallback UX (spec AD #5).
     *
     * <p>All other HTTP errors, network errors, and timeouts get user-safe
     * generic messages. The original exception is preserved as {@code cause}
     * so server-side logs retain context — the client never sees upstream
     * error text.
     */
    private ProxyException mapWebClientError(String operation, RuntimeException ex) {
        if (ex instanceof WebClientResponseException wcre) {
            if (wcre.getStatusCode().value() == 404) {
                return new FcbhNotFoundException("Audio not available for this chapter.");
            }
            log.warn("FCBH upstream HTTP error operation={} status={}",
                operation, wcre.getStatusCode().value());
            return new UpstreamException(
                "FCBH service is temporarily unavailable. Please try again.", wcre);
        }
        if (ex instanceof WebClientRequestException wcre) {
            log.warn("FCBH upstream network error operation={}", operation);
            return new UpstreamException(
                "FCBH service is temporarily unavailable. Please try again.", wcre);
        }
        if (isTimeout(ex)) {
            log.warn("FCBH upstream timeout operation={}", operation);
            return new UpstreamTimeoutException(
                "FCBH service timed out. Please try again.", ex);
        }
        log.warn("FCBH upstream unknown error operation={} exClass={}",
            operation, ex.getClass().getSimpleName());
        return new UpstreamException(
            "FCBH service is temporarily unavailable. Please try again.", ex);
    }

    /**
     * Walk the exception cause chain looking for a {@link TimeoutException}.
     * No substring fallback — an exception whose message contains "timeout"
     * but isn't a real timeout should still be classified as 502
     * UPSTREAM_ERROR, not 504 UPSTREAM_TIMEOUT.
     */
    private static boolean isTimeout(Throwable ex) {
        Throwable cur = ex;
        while (cur != null) {
            if (cur instanceof TimeoutException) return true;
            if (cur.getCause() == cur) return false;
            cur = cur.getCause();
        }
        return false;
    }
}
