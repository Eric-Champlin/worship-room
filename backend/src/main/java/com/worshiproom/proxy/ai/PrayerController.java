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
 * HTTP endpoint for the personalized prayer generation feature on the Daily Hub Pray tab.
 *
 * Coexists with {@link AskController} and {@link GeminiController} under the same base
 * path ({@code /api/v1/proxy/ai}); only the endpoint suffix differs
 * ({@code /pray} here vs. {@code /ask}, {@code /explain}, {@code /reflect}).
 *
 * All error paths flow through {@code ProxyExceptionHandler} (Spec 1).
 * Logging follows the PII discipline documented in {@code 07-logging-monitoring.md}:
 * length only, never request content, never response text content.
 */
@RestController
@RequestMapping("/api/v1/proxy/ai")
public class PrayerController {

    private static final Logger log = LoggerFactory.getLogger(PrayerController.class);

    private final PrayerService service;

    public PrayerController(PrayerService service) {
        this.service = service;
    }

    @PostMapping("/pray")
    public ProxyResponse<PrayerResponseDto> pray(@Valid @RequestBody PrayerRequest request) {
        log.info("Prayer request received requestLength={}", request.request().length());
        PrayerResponseDto result = service.pray(request);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
