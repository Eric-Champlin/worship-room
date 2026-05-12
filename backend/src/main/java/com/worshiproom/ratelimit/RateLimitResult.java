package com.worshiproom.ratelimit;

import java.time.Duration;

/**
 * Outcome of a {@link RateLimiter#tryConsume} call (Spec 5.6 / D9).
 *
 * @param allowed    whether a token was consumed
 * @param remaining  tokens remaining in the bucket after this attempt
 * @param retryAfter when {@code !allowed}, time until next token; when {@code allowed}, {@link Duration#ZERO}
 */
public record RateLimitResult(boolean allowed, long remaining, Duration retryAfter) {}
