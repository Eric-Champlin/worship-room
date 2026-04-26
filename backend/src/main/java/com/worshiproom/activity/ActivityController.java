package com.worshiproom.activity;

import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.activity.dto.ActivityResponseData;
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
 * HTTP boundary for the Activity API. Authenticates, validates, and
 * delegates to {@link ActivityService}; the service owns the transaction
 * and orchestration.
 *
 * <p>PII discipline (per {@code 07-logging-monitoring.md}): the INFO log
 * line below records {@code userId} (UUID), {@code activityType} (bounded
 * enum wire string), and {@code sourceFeature} (bounded to 50 characters).
 * The {@code metadata} field is opaque client-supplied JSON and is NEVER
 * logged.
 */
@RestController
@RequestMapping("/api/v1/activity")
public class ActivityController {

    private static final Logger log = LoggerFactory.getLogger(ActivityController.class);

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @PostMapping
    public ResponseEntity<ProxyResponse<ActivityResponseData>> recordActivity(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ActivityRequest request) {

        log.info("Activity received userId={} activityType={} sourceFeature={}",
            principal.userId(), request.activityType().wireValue(), request.sourceFeature());

        ActivityResponseData payload = activityService.recordActivity(
            principal.userId(), request);

        return ResponseEntity.ok(ProxyResponse.of(payload, MDC.get("requestId")));
    }
}
