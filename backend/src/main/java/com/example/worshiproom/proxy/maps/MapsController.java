package com.example.worshiproom.proxy.maps;

import com.example.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * HTTP endpoints for Google Maps-backed features — places search, geocoding,
 * and Places photo media.
 *
 * <p>All three endpoints route through {@link GoogleMapsService}, which owns
 * the Maps API key, the three Caffeine caches, and the error-mapping
 * chokepoint. Controller is thin: request-body/param validation + response
 * envelope.
 *
 * <p>Error paths flow through the shared {@code ProxyExceptionHandler}:
 * <ul>
 *   <li>{@code MethodArgumentNotValidException} (from {@code @Valid @RequestBody})
 *       → 400 INVALID_INPUT</li>
 *   <li>{@code ConstraintViolationException} (from {@code @Validated} + param
 *       constraints, including the SSRF-guard {@code @Pattern} on
 *       {@code place-photo}) → 400 INVALID_INPUT (handler added in this spec)</li>
 *   <li>{@code IllegalArgumentException} from the service's defense-in-depth
 *       SSRF check → falls through to 500 INTERNAL_ERROR, which is correct —
 *       if the controller's {@code @Pattern} is bypassed, that's a server bug</li>
 *   <li>{@code UpstreamException} → 502 UPSTREAM_ERROR</li>
 *   <li>{@code UpstreamTimeoutException} → 504 UPSTREAM_TIMEOUT</li>
 *   <li>{@code RateLimitExceededException} (filter-raised) → 429 RATE_LIMITED
 *       via {@code RateLimitExceptionHandler}</li>
 * </ul>
 *
 * <p>Rate limiting inherited from {@code RateLimitFilter} scoped to
 * {@code /api/v1/proxy/**}.
 */
@RestController
@RequestMapping("/api/v1/proxy/maps")
@Validated
public class MapsController {

    private static final Logger log = LoggerFactory.getLogger(MapsController.class);

    private final GoogleMapsService service;

    public MapsController(GoogleMapsService service) {
        this.service = service;
    }

    @PostMapping("/places-search")
    public ProxyResponse<PlacesSearchResponse> placesSearch(@Valid @RequestBody PlacesSearchRequest req) {
        log.info("Places search received lat={} lng={} radiusMiles={} keywordLength={} hasPageToken={}",
            req.lat(), req.lng(), req.radiusMiles(), req.keyword().length(),
            req.pageToken() != null && !req.pageToken().isEmpty());
        PlacesSearchResponse result = service.search(req);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/geocode")
    public ProxyResponse<GeocodeResponse> geocode(
        @RequestParam @NotBlank @Size(min = 1, max = 200) String query
    ) {
        log.info("Geocode received queryLength={}", query.length());
        GeocodeResponse result = service.geocode(query);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/place-photo")
    public ResponseEntity<byte[]> placePhoto(
        @RequestParam
        @NotBlank
        @Pattern(regexp = "^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$",
                 message = "must match places/{placeId}/photos/{photoId}")
        String name
    ) {
        log.info("Place photo received nameLength={}", name.length());
        GoogleMapsService.PhotoBytes photo = service.fetchPhoto(name);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(photo.contentType());
        headers.setCacheControl("public, max-age=86400, immutable");
        return ResponseEntity.ok().headers(headers).body(photo.bytes());
    }
}
