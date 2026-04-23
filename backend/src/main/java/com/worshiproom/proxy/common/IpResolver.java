package com.worshiproom.proxy.common;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the real client IP from an HTTP request.
 *
 * Resolution order when {@code trustForwardedHeaders} is TRUE (prod):
 *   1. First (leftmost) entry in X-Forwarded-For, trimmed
 *   2. X-Real-IP, trimmed
 *   3. request.getRemoteAddr()
 *   4. "unknown" fallback
 *
 * When {@code trustForwardedHeaders} is FALSE (dev / local, where nothing
 * trusted sits between the client and the app), X-Forwarded-For and
 * X-Real-IP are IGNORED. Trusting them in that posture would let an
 * attacker cycle random values per request to bypass rate limiting and
 * grow the bucket map unboundedly.
 *
 * In production, Railway and Vercel sanitize incoming X-Forwarded-For
 * (strip the client's value, overwrite with the real IP they observed),
 * so the headers are safe to trust there.
 *
 * Thread-safe — the trust flag is final and read-only after construction.
 */
public class IpResolver {

    private static final String X_FORWARDED_FOR = "X-Forwarded-For";
    private static final String X_REAL_IP = "X-Real-IP";

    private final boolean trustForwardedHeaders;

    public IpResolver(boolean trustForwardedHeaders) {
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

    public String resolve(HttpServletRequest request) {
        if (trustForwardedHeaders) {
            String xff = request.getHeader(X_FORWARDED_FOR);
            if (xff != null && !xff.isBlank()) {
                int comma = xff.indexOf(',');
                String first = (comma >= 0) ? xff.substring(0, comma) : xff;
                String trimmed = first.trim();
                if (!trimmed.isEmpty()) return trimmed;
            }
            String real = request.getHeader(X_REAL_IP);
            if (real != null && !real.isBlank()) return real.trim();
        }
        String remote = request.getRemoteAddr();
        return (remote != null && !remote.isEmpty()) ? remote : "unknown";
    }
}
