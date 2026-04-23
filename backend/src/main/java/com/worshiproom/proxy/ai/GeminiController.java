package com.worshiproom.proxy.ai;

import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * HTTP endpoints for Gemini-backed AI features (BB-30 Explain, BB-31 Reflect).
 *
 * Both endpoints share the same request shape and response envelope — the
 * only per-endpoint difference is the system prompt used internally.
 *
 * All error paths flow through {@code ProxyExceptionHandler} (Spec 1).
 * Specifically:
 *   - Bean Validation failures → 400 INVALID_INPUT
 *   - SafetyBlockException → 422 SAFETY_BLOCK
 *   - UpstreamException → 502 UPSTREAM_ERROR
 *   - UpstreamTimeoutException → 504 UPSTREAM_TIMEOUT
 *   - Unhandled Throwable → 500 INTERNAL_ERROR (generic, safe message)
 *   - RateLimitExceededException (from the filter) → 429 RATE_LIMITED
 *     (handled by {@code RateLimitExceptionHandler} separately)
 *
 * Both endpoints are rate-limited by {@code RateLimitFilter} (Spec 1) which
 * matches {@code /api/v1/proxy/**} prefix.
 */
@RestController
@RequestMapping("/api/v1/proxy/ai")
public class GeminiController {

    private static final Logger log = LoggerFactory.getLogger(GeminiController.class);

    private final GeminiService geminiService;

    public GeminiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/explain")
    public ProxyResponse<GeminiResponseDto> explain(@Valid @RequestBody ExplainRequest request) {
        log.info(
                "Explain request received reference={} verseTextLength={}",
                request.reference(),
                request.verseText().length()
        );
        GeminiResponseDto payload = geminiService.generateExplanation(
                request.reference(),
                request.verseText()
        );
        return ProxyResponse.of(payload, MDC.get("requestId"));
    }

    @PostMapping("/reflect")
    public ProxyResponse<GeminiResponseDto> reflect(@Valid @RequestBody ReflectRequest request) {
        log.info(
                "Reflect request received reference={} verseTextLength={}",
                request.reference(),
                request.verseText().length()
        );
        GeminiResponseDto payload = geminiService.generateReflection(
                request.reference(),
                request.verseText()
        );
        return ProxyResponse.of(payload, MDC.get("requestId"));
    }
}
