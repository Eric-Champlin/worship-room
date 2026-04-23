package com.worshiproom.proxy.common;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an upstream AI model refused to generate a response due to its
 * safety filters. Distinct from {@link UpstreamException} (502) because a
 * safety block is not a server failure — the request was valid, the upstream
 * was reachable, the upstream deliberately chose not to answer.
 *
 * HTTP 422 (Unprocessable Content) per RFC 9110 §15.5.21: "the server
 * understands the content type of the request, and the syntax of the request
 * is correct, but it was unable to process the contained instructions". A
 * safety block fits that description exactly.
 *
 * The frontend maps this to {@code GeminiSafetyBlockError} and renders the
 * user-facing copy: "This passage is too difficult for our AI helper to
 * explain well. Consider reading a scholarly commentary or asking a trusted
 * teacher."
 *
 * Raised by:
 *   - {@code GeminiService} on prompt-level block, output-level block, or
 *     empty-text silent block
 *
 * Caught by:
 *   - {@code ProxyExceptionHandler.handleProxyException} via the generic
 *     {@link ProxyException} catch — no dedicated handler needed because
 *     the shape already carries status + code
 */
public class SafetyBlockException extends ProxyException {

    public SafetyBlockException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "SAFETY_BLOCK", message);
    }

    public SafetyBlockException(String message, Throwable cause) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "SAFETY_BLOCK", message, cause);
    }
}
