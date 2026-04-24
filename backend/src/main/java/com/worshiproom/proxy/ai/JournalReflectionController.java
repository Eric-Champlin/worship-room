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
 * HTTP endpoint for the journal reflection feature on the Daily Hub Journal tab.
 *
 * Coexists with {@link AskController}, {@link PrayerController}, and {@link GeminiController}
 * under the same base path ({@code /api/v1/proxy/ai}); only the endpoint suffix differs
 * ({@code /reflect-journal} here vs. {@code /ask}, {@code /pray}, {@code /explain}, {@code /reflect}).
 *
 * All error paths flow through {@code ProxyExceptionHandler} (Spec 1).
 * Logging follows the PII discipline documented in {@code 07-logging-monitoring.md}:
 * length only, never entry content, never response text content. Journal entries are
 * the most sensitive content in the app.
 */
@RestController
@RequestMapping("/api/v1/proxy/ai")
public class JournalReflectionController {

    private static final Logger log = LoggerFactory.getLogger(JournalReflectionController.class);

    private final JournalReflectionService service;

    public JournalReflectionController(JournalReflectionService service) {
        this.service = service;
    }

    @PostMapping("/reflect-journal")
    public ProxyResponse<JournalReflectionResponseDto> reflect(@Valid @RequestBody JournalReflectionRequest request) {
        log.info("Journal reflection request received entryLength={}", request.entry().length());
        JournalReflectionResponseDto result = service.reflect(request);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
