package com.worshiproom.proxy.maps;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;

/**
 * Server-side Google Maps caller. Wraps WebClient calls to three upstreams —
 * Places API (New) text search, Geocoding API, and the Places photo media
 * endpoint — and maps SDK/HTTP errors to typed proxy exceptions from
 * {@code com.worshiproom.proxy.common}.
 *
 * <p>The Maps API key is never exposed to the frontend; it lives only on the
 * server under {@code proxy.google-maps.api-key}. On a missing/empty key, every
 * call throws {@link UpstreamException} with a user-safe message.
 *
 * <p>Three bounded Caffeine caches protect the Google quota across users (see
 * {@code 02-security.md} § "BOUNDED EXTERNAL-INPUT CACHES"):
 * <ul>
 *   <li>{@code placesSearchCache} — 1000 entries, 6h TTL</li>
 *   <li>{@code geocodeCache} — 500 entries, 30d TTL</li>
 *   <li>{@code photoCache} — 500 entries, 7d TTL</li>
 * </ul>
 *
 * <p>The three {@code call*} methods are package-private test seams (D2b
 * pattern from Spec 2). Tests use {@code Mockito.spy()} + {@code doReturn()}
 * on these methods to stub the upstream boundary without mocking WebClient's
 * fluent builder.
 */
@Service
public class GoogleMapsService {

    private static final Logger log = LoggerFactory.getLogger(GoogleMapsService.class);

    private static final String PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
    private static final String PHOTO_URL_TEMPLATE = "https://places.googleapis.com/v1/%s/media?maxWidthPx=400&key=%s";
    private static final Pattern PHOTO_NAME_PATTERN =
        Pattern.compile("^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$");
    private static final Duration UPSTREAM_TIMEOUT = Duration.ofSeconds(10);

    private static final String REQUESTED_FIELDS = String.join(",",
        "places.id", "places.displayName", "places.formattedAddress",
        "places.nationalPhoneNumber", "places.internationalPhoneNumber",
        "places.websiteUri", "places.location", "places.rating",
        "places.photos", "places.editorialSummary", "places.regularOpeningHours",
        "places.types", "places.businessStatus", "nextPageToken");

    private final ProxyConfig proxyConfig;
    private final WebClient webClient;

    private final Cache<String, PlacesSearchResponse> placesSearchCache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(Duration.ofHours(6))
        .build();

    private final Cache<String, GeocodeResponse> geocodeCache = Caffeine.newBuilder()
        .maximumSize(500)
        .expireAfterWrite(Duration.ofDays(30))
        .build();

    private final Cache<String, byte[]> photoCache = Caffeine.newBuilder()
        .maximumSize(500)
        .expireAfterWrite(Duration.ofDays(7))
        .build();

    public GoogleMapsService(ProxyConfig proxyConfig, WebClient proxyWebClient) {
        this.proxyConfig = proxyConfig;
        this.webClient = proxyWebClient;
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            log.warn("GOOGLE_MAPS_API_KEY is not configured. /api/v1/proxy/maps/* endpoints "
                + "will return 502 UPSTREAM_ERROR until it is set.");
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────

    public PlacesSearchResponse search(PlacesSearchRequest req) {
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            throw new UpstreamException("Maps service is not configured on the server.");
        }
        String key = MapsCacheKeys.searchKey(
            req.lat(), req.lng(), req.radiusMiles(), req.keyword(), req.pageToken());
        PlacesSearchResponse cached = placesSearchCache.getIfPresent(key);
        if (cached != null) return cached;

        Map<String, Object> body = buildSearchBody(req);
        try {
            Map<String, Object> response = callPlacesSearch(body).block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("Maps service returned no response.");
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> places =
                (List<Map<String, Object>>) response.getOrDefault("places", List.of());
            String nextPageToken = (String) response.get("nextPageToken");
            PlacesSearchResponse result = new PlacesSearchResponse(places, nextPageToken);
            placesSearchCache.put(key, result);
            return result;
        } catch (UpstreamException | UpstreamTimeoutException ex) {
            throw ex;
        } catch (WebClientResponseException ex) {
            throw mapUpstreamHttpError("Places API", ex);
        } catch (WebClientRequestException ex) {
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        } catch (RuntimeException ex) {
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException("Maps service timed out. Please try again.", ex);
            }
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        }
    }

    public GeocodeResponse geocode(String query) {
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            throw new UpstreamException("Maps service is not configured on the server.");
        }
        String key = MapsCacheKeys.geocodeKey(query);
        GeocodeResponse cached = geocodeCache.getIfPresent(key);
        if (cached != null) return cached;

        try {
            Map<String, Object> response = callGeocode(query).block(UPSTREAM_TIMEOUT);
            if (response == null) {
                throw new UpstreamException("Maps service returned no response.");
            }
            String status = (String) response.get("status");
            GeocodeResponse result;
            if ("OK".equals(status)) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
                if (results == null || results.isEmpty()) {
                    result = GeocodeResponse.NO_RESULT;
                } else {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> geometry = (Map<String, Object>) results.get(0).get("geometry");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> location = (Map<String, Object>) geometry.get("location");
                    Double lat = ((Number) location.get("lat")).doubleValue();
                    Double lng = ((Number) location.get("lng")).doubleValue();
                    result = new GeocodeResponse(lat, lng);
                }
            } else if ("ZERO_RESULTS".equals(status)) {
                result = GeocodeResponse.NO_RESULT;
            } else {
                // OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, UNKNOWN_ERROR
                throw new UpstreamException("Maps service rejected the geocode request.");
            }
            geocodeCache.put(key, result);
            return result;
        } catch (UpstreamException | UpstreamTimeoutException ex) {
            throw ex;
        } catch (WebClientResponseException ex) {
            throw mapUpstreamHttpError("Geocoding API", ex);
        } catch (WebClientRequestException ex) {
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        } catch (RuntimeException ex) {
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException("Maps service timed out. Please try again.", ex);
            }
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        }
    }

    public PhotoBytes fetchPhoto(String name) {
        if (!proxyConfig.getGoogleMaps().isConfigured()) {
            throw new UpstreamException("Maps service is not configured on the server.");
        }
        if (!PHOTO_NAME_PATTERN.matcher(name).matches()) {
            // SSRF guard — defense-in-depth after the controller's @Pattern check.
            throw new IllegalArgumentException("Invalid photo name format.");
        }
        String key = MapsCacheKeys.photoKey(name);
        byte[] cached = photoCache.getIfPresent(key);
        if (cached != null) return new PhotoBytes(cached, MediaType.IMAGE_JPEG);

        try {
            PhotoBytes result = callPlacePhoto(name).block(UPSTREAM_TIMEOUT);
            if (result == null) {
                throw new UpstreamException("Maps service returned no response.");
            }
            photoCache.put(key, result.bytes());
            return result;
        } catch (UpstreamException | UpstreamTimeoutException ex) {
            throw ex;
        } catch (WebClientResponseException ex) {
            throw mapUpstreamHttpError("Places photo media", ex);
        } catch (WebClientRequestException ex) {
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        } catch (RuntimeException ex) {
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException("Maps service timed out. Please try again.", ex);
            }
            throw new UpstreamException("Maps service is temporarily unavailable. Please try again.", ex);
        }
    }

    /** Public readiness probe — mirrors {@code GeminiService}'s configured check. */
    public boolean isConfigured() {
        return proxyConfig.getGoogleMaps().isConfigured();
    }

    // ─── Package-private test seams (D2b pattern from Spec 2) ────────────

    Mono<Map<String, Object>> callPlacesSearch(Map<String, Object> body) {
        String apiKey = proxyConfig.getGoogleMaps().getApiKey();
        return webClient.post()
            .uri(PLACES_TEXT_SEARCH_URL)
            .header("X-Goog-Api-Key", apiKey)
            .header("X-Goog-FieldMask", REQUESTED_FIELDS)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    Mono<Map<String, Object>> callGeocode(String query) {
        String apiKey = proxyConfig.getGoogleMaps().getApiKey();
        return webClient.get()
            .uri(uriBuilder -> uriBuilder
                .scheme("https").host("maps.googleapis.com").path("/maps/api/geocode/json")
                .queryParam("address", query)
                .queryParam("key", apiKey)
                .build())
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /**
     * Two-step fetch: the Places API v1 photo media endpoint returns a JSON
     * {@code {photoUri}} object by default (the old 302-redirect behavior is
     * now opt-in via {@code skipHttpRedirect=false}). The {@code photoUri} is
     * a signed Google CDN URL with no API key embedded, so we relay the bytes
     * from there. Keeps our Maps API key entirely server-side.
     */
    Mono<PhotoBytes> callPlacePhoto(String name) {
        String apiKey = proxyConfig.getGoogleMaps().getApiKey();
        String metaUrl = String.format(PHOTO_URL_TEMPLATE, name, apiKey);
        return webClient.get()
            .uri(metaUrl)
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .flatMap(meta -> {
                String photoUri = (String) meta.get("photoUri");
                if (photoUri == null || photoUri.isBlank()) {
                    return Mono.error(new UpstreamException("Maps photo response missing photoUri."));
                }
                return webClient.get()
                    .uri(photoUri)
                    .retrieve()
                    .toEntity(byte[].class)
                    .map(entity -> {
                        MediaType contentType = entity.getHeaders().getContentType();
                        if (contentType == null) contentType = MediaType.IMAGE_JPEG;
                        byte[] body = entity.getBody();
                        if (body == null || body.length == 0) {
                            throw new UpstreamException("Maps service returned empty photo body.");
                        }
                        return new PhotoBytes(body, contentType);
                    });
            });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private static Map<String, Object> buildSearchBody(PlacesSearchRequest req) {
        Map<String, Object> circle = Map.of(
            "center", Map.of("latitude", req.lat(), "longitude", req.lng()),
            "radius", req.radiusMiles() * 1609.344);
        LinkedHashMap<String, Object> body = new LinkedHashMap<>();
        body.put("textQuery", req.keyword());
        body.put("locationBias", Map.of("circle", circle));
        body.put("maxResultCount", 20);
        if (req.pageToken() != null && !req.pageToken().isEmpty()) {
            body.put("pageToken", req.pageToken());
        }
        return body;
    }

    /**
     * Chokepoint for all Google HTTP errors. Returns a user-safe generic
     * message. The original {@code WebClientResponseException} is preserved as
     * {@code cause} so server-side logs retain context — the client never
     * sees upstream error text (see {@code 02-security.md} § "Never Leak
     * Upstream Error Text").
     */
    private static UpstreamException mapUpstreamHttpError(String surface, WebClientResponseException ex) {
        log.warn("{} upstream error: status={} bodyLength={}",
            surface, ex.getStatusCode().value(),
            ex.getResponseBodyAsString() == null ? 0 : ex.getResponseBodyAsString().length());
        return new UpstreamException(
            "Maps service is temporarily unavailable. Please try again.", ex);
    }

    /**
     * Walk the exception cause chain looking for a {@link TimeoutException}.
     * WebClient wraps timeouts differently depending on whether they came
     * from {@code Mono.block(Duration)}, {@code Mono.timeout()}, or the
     * underlying Netty connection, but all paths ultimately carry a
     * {@code java.util.concurrent.TimeoutException} somewhere in the chain.
     *
     * <p>No substring fallback: an exception whose message happens to contain
     * the word "timeout" but isn't a real timeout should still be classified
     * as 502 UPSTREAM_ERROR, not 504 UPSTREAM_TIMEOUT.
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

    /** Binary photo response. Public so {@code MapsController} can unwrap it. */
    public record PhotoBytes(byte[] bytes, MediaType contentType) {}
}
