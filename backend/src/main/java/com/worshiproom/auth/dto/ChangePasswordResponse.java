package com.worshiproom.auth.dto;

/**
 * Forums Wave Spec 1.5g — response body for {@code POST /api/v1/auth/change-password}.
 *
 * <p>Carries the freshly-issued JWT that the caller swaps into their stored
 * token. Other devices' tokens (with the now-stale {@code gen} claim) fail the
 * filter check on their next request and receive 401 TOKEN_REVOKED.
 *
 * <p>Pre-1.5g shape was a 204 No Content. The shape change is documented in the
 * OpenAPI spec and the frontend's {@code changePasswordApi}.
 */
public record ChangePasswordResponse(String token) {
}
