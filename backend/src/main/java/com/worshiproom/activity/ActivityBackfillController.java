package com.worshiproom.activity;

import com.worshiproom.activity.dto.ActivityBackfillRequest;
import com.worshiproom.activity.dto.ActivityBackfillResponse;
import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * HTTP boundary for the historical activity backfill endpoint (Spec 2.10).
 *
 * <p>Authenticated; delegates to {@link ActivityBackfillService} which owns
 * the transaction. Mirrors the thin-controller pattern from
 * {@link ActivityController}.
 *
 * <p>PII discipline: logs userId (UUID) and the four insertion counts in the
 * response. Never logs payload contents (activity flags, badge metadata).
 */
@RestController
@RequestMapping("/api/v1/activity/backfill")
public class ActivityBackfillController {

    private static final Logger log = LoggerFactory.getLogger(ActivityBackfillController.class);

    private final ActivityBackfillService backfillService;

    public ActivityBackfillController(ActivityBackfillService backfillService) {
        this.backfillService = backfillService;
    }

    @PostMapping
    public ResponseEntity<ProxyResponse<ActivityBackfillResponse>> backfill(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ActivityBackfillRequest request) {

        log.info("Backfill request received userId={} schemaVersion={} dateCount={}",
            principal.userId(), request.schemaVersion(), request.activityLog().size());

        ActivityBackfillResponse payload = backfillService.backfill(principal.userId(), request);

        return ResponseEntity.ok(ProxyResponse.of(payload, MDC.get("requestId")));
    }
}
