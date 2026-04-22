package com.example.worshiproom.proxy.bible;

import com.example.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * FCBH Digital Bible Platform v4 proxy controller. Exposes four GET endpoints
 * for Bible audio metadata; audio mp3 bytes continue to stream directly from
 * signed CloudFront URLs to the browser (see spec AD #2).
 *
 * <p>Path and query parameters are {@code @Pattern}-validated — a
 * {@code ConstraintViolationException} triggers the shared
 * {@code ProxyExceptionHandler} → 400 INVALID_INPUT branch. This is also an
 * SSRF defense-in-depth layer: the service builds outbound URLs from
 * path-variable values, so tight regex constraints prevent path traversal
 * attempts from reaching {@code 4.dbt.io}.
 */
@RestController
@RequestMapping("/api/v1/proxy/bible")
@Validated
public class FcbhController {

    private static final Logger log = LoggerFactory.getLogger(FcbhController.class);
    private static final String FILESET_PATTERN = "^[A-Z0-9-]{3,30}$";
    private static final String BOOK_CODE_PATTERN = "^[A-Z0-9]{3}$";
    private static final String LANGUAGE_PATTERN = "^[a-z]{2,3}$";

    private final FcbhService service;

    public FcbhController(FcbhService service) {
        this.service = service;
    }

    @GetMapping("/bibles")
    public ProxyResponse<Map<String, Object>> listBibles(
        @RequestParam(defaultValue = "eng") @Pattern(regexp = LANGUAGE_PATTERN) String language
    ) {
        log.info("FCBH list bibles language={}", language);
        Map<String, Object> result = service.listBibles(language);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/filesets/{filesetId}")
    public ProxyResponse<Map<String, Object>> getFileset(
        @PathVariable @NotBlank @Pattern(regexp = FILESET_PATTERN) String filesetId
    ) {
        log.info("FCBH get fileset filesetId={}", filesetId);
        Map<String, Object> result = service.getFileset(filesetId);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/filesets/{filesetId}/{bookCode}/{chapter}")
    public ProxyResponse<Map<String, Object>> getChapter(
        @PathVariable @NotBlank @Pattern(regexp = FILESET_PATTERN) String filesetId,
        @PathVariable @NotBlank @Pattern(regexp = BOOK_CODE_PATTERN) String bookCode,
        @PathVariable @Min(1) @Max(200) int chapter
    ) {
        log.info("FCBH get chapter filesetId={} bookCode={} chapter={}",
            filesetId, bookCode, chapter);
        Map<String, Object> result = service.getChapter(filesetId, bookCode, chapter);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }

    @GetMapping("/timestamps/{filesetId}/{bookCode}/{chapter}")
    public ProxyResponse<Map<String, Object>> getTimestamps(
        @PathVariable @NotBlank @Pattern(regexp = FILESET_PATTERN) String filesetId,
        @PathVariable @NotBlank @Pattern(regexp = BOOK_CODE_PATTERN) String bookCode,
        @PathVariable @Min(1) @Max(200) int chapter
    ) {
        log.info("FCBH get timestamps filesetId={} bookCode={} chapter={}",
            filesetId, bookCode, chapter);
        Map<String, Object> result = service.getTimestamps(filesetId, bookCode, chapter);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
