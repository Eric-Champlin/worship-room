package com.worshiproom.post;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.post.dto.PrayerReceiptResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Spec 6.1 — Prayer Receipt endpoints. Author-only.
 *
 * <p>Two endpoints:
 * <ul>
 *   <li>{@code GET /api/v1/posts/{id}/prayer-receipt} — fetch the receipt
 *       (count + classified intercessors). 60/hour/user rate limit.
 *   <li>{@code POST /api/v1/posts/{id}/prayer-receipt/share} — record a share
 *       event (rate-limit accounting only, no DB write). 5/post/user/day.
 * </ul>
 *
 * <p><b>Privacy contract (Gate-31):</b> non-authors get 403; deleted/missing
 * posts get 404 — for EVERYONE, including the author, so non-authors cannot
 * differentiate "not your post" from "post doesn't exist." The controller
 * checks deletion BEFORE author identity to enforce this.
 *
 * <p>Lives in {@code com.worshiproom.post} so {@link PostExceptionHandler}'s
 * package-scoped advice picks up exceptions thrown here.
 */
@RestController
@RequestMapping("/api/v1/posts")
public class PrayerReceiptController {

    private static final Logger log = LoggerFactory.getLogger(PrayerReceiptController.class);

    private final PrayerReceiptService prayerReceiptService;
    private final PrayerReceiptReadRateLimitService readRateLimit;
    private final PrayerReceiptShareRateLimitService shareRateLimit;
    private final PostRepository postRepository;

    public PrayerReceiptController(
            PrayerReceiptService prayerReceiptService,
            PrayerReceiptReadRateLimitService readRateLimit,
            PrayerReceiptShareRateLimitService shareRateLimit,
            PostRepository postRepository) {
        this.prayerReceiptService = prayerReceiptService;
        this.readRateLimit = readRateLimit;
        this.shareRateLimit = shareRateLimit;
        this.postRepository = postRepository;
    }

    @GetMapping("/{postId}/prayer-receipt")
    public ResponseEntity<ProxyResponse<PrayerReceiptResponse>> getReceipt(
            @PathVariable UUID postId,
            @AuthenticationPrincipal AuthenticatedUser viewer
    ) {
        // Rate-limit BEFORE post existence check — bounds resource cost of
        // existence-scanning attacks (W30, defense in depth).
        readRateLimit.checkAndConsume(viewer.userId());

        // 404 for missing AND soft-deleted posts — uniform across all viewers.
        // Author + non-author both land here when the post is deleted, so the
        // non-author cannot differentiate "not your post" from "post deleted."
        Post post = postRepository.findById(postId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(PostNotFoundException::new);

        // 403 for non-authors of LIVE posts. Generic message (Gate-31, no leak).
        if (!viewer.userId().equals(post.getUserId())) {
            log.info("Receipt 403 postId={} requesterId={}", postId, viewer.userId());
            throw new PrayerReceiptForbiddenException();
        }

        PrayerReceiptResponse receipt = prayerReceiptService.buildReceipt(postId);
        String requestId = MDC.get("requestId");
        log.info("Receipt fetched postId={} totalCount={} requestId={}",
                postId, receipt.totalCount(), requestId);
        return ResponseEntity.ok(ProxyResponse.of(receipt, requestId));
    }

    @PostMapping("/{postId}/prayer-receipt/share")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recordShare(
            @PathVariable UUID postId,
            @AuthenticationPrincipal AuthenticatedUser viewer
    ) {
        // Same ordering as GET — 404 before 403 before rate-limit consumption.
        // Rate limit AFTER auth checks here because the share rate limit is
        // composite-keyed (post, user) and the post must exist + the user must
        // be the author for the rate limit to be meaningful.
        Post post = postRepository.findById(postId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(PostNotFoundException::new);

        if (!viewer.userId().equals(post.getUserId())) {
            log.info("Share 403 postId={} requesterId={}", postId, viewer.userId());
            throw new PrayerReceiptForbiddenException();
        }

        shareRateLimit.checkAndConsume(postId, viewer.userId());
        log.info("Share recorded postId={} authorId={}", postId, viewer.userId());
    }
}
