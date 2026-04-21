package com.example.worshiproom.proxy.maps;

/**
 * Response body for {@code GET /api/v1/proxy/maps/geocode}.
 *
 * <p>Both fields are nullable: for unresolvable queries the response is still
 * HTTP 200 with {@code data: {lat: null, lng: null}}, which matches the
 * frontend's existing {@code Promise<{lat, lng} | null>} contract where
 * {@code null} means "no match" rather than "error". The no-result case is
 * cached so typo hammering doesn't re-hit Google.
 */
public record GeocodeResponse(Double lat, Double lng) {
    public static final GeocodeResponse NO_RESULT = new GeocodeResponse(null, null);
}
