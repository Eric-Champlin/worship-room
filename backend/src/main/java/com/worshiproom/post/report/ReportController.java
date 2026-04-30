package com.worshiproom.post.report;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.report.dto.CreateReportRequest;
import com.worshiproom.post.report.dto.ReportData;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Spec 3.8 — write endpoints for post and comment reports.
 *
 * <p>Stays in its own sub-package {@code com.worshiproom.post.report} mirroring
 * {@code com.worshiproom.post.comment} (R3). Auth gating handled at SecurityConfig
 * (method-specific rules placed BEFORE OPTIONAL_AUTH_PATTERNS per Phase 3 Addendum #4).
 *
 * <p>Status code disambiguation: 201 when a new pending row was inserted, 200
 * when an existing pending report was returned (idempotent semantics per
 * Spec 3.8 D4). Mirrors the bookmark-write status convention.
 */
@RestController
@RequestMapping("/api/v1")
public class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/posts/{postId}/reports")
    public ResponseEntity<ProxyResponse<ReportData>> reportPost(
            @PathVariable UUID postId,
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateReportRequest request) {
        UUID reporterId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Post report requested reporterId={} postId={} reason={}",
                reporterId, postId, request.reason().name().toLowerCase());
        ReportService.ReportResult result = reportService.report(
                ReportService.TargetType.POST, postId, reporterId, request, requestId);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ProxyResponse.of(result.data(), requestId));
    }

    @PostMapping("/comments/{commentId}/reports")
    public ResponseEntity<ProxyResponse<ReportData>> reportComment(
            @PathVariable UUID commentId,
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateReportRequest request) {
        UUID reporterId = principal.userId();
        String requestId = MDC.get("requestId");
        log.info("Comment report requested reporterId={} commentId={} reason={}",
                reporterId, commentId, request.reason().name().toLowerCase());
        ReportService.ReportResult result = reportService.report(
                ReportService.TargetType.COMMENT, commentId, reporterId, request, requestId);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ProxyResponse.of(result.data(), requestId));
    }
}
