package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * HTTP endpoint for the Ask AI Scripture-grounded Q&A feature.
 *
 * Coexists with {@link GeminiController} under the same base path
 * ({@code /api/v1/proxy/ai}); only the endpoint suffix differs
 * ({@code /ask} here vs. {@code /explain} and {@code /reflect} in Spec 2).
 *
 * All error paths flow through {@code ProxyExceptionHandler} (Spec 1).
 * Logging follows the PII discipline documented in
 * {@code 07-logging-monitoring.md}: lengths only, never content.
 */
@RestController
@RequestMapping("/api/v1/proxy/ai")
public class AskController {

    private static final Logger log = LoggerFactory.getLogger(AskController.class);

    private final AskService service;

    public AskController(AskService service) {
        this.service = service;
    }

    @PostMapping("/ask")
    public ProxyResponse<AskResponseDto> ask(@Valid @RequestBody AskRequest request) {
        int historyLength = request.conversationHistory() == null
            ? 0 : request.conversationHistory().size();
        log.info("Ask request received questionLength={} historyLength={}",
            request.question().length(), historyLength);
        AskResponseDto result = service.ask(request);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
