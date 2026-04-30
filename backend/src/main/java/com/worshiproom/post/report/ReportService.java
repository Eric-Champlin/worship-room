package com.worshiproom.post.report;

import com.worshiproom.post.Post;
import com.worshiproom.post.comment.PostComment;
import com.worshiproom.post.report.dto.CreateReportRequest;
import com.worshiproom.post.report.dto.ReportData;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Spec 3.8 — heart of the report-write flow.
 *
 * <p>The {@link #report} method is idempotent on PENDING (per Spec 3.8 D4):
 * a second submission against the same target by the same reporter while a
 * previous report is still pending returns the existing report id with
 * {@code created=false}. Closed reports (reviewed / dismissed / actioned)
 * allow re-reporting.
 *
 * <p>Concurrency is handled with {@code SELECT ... FOR UPDATE} via
 * {@code @Lock(PESSIMISTIC_WRITE)} on the find-pending query (the schema
 * has NO UNIQUE constraint per MPD-1, so the lock is the only thing
 * preventing duplicate inserts).
 *
 * <p>Visibility filtering is DELIBERATELY skipped (Spec 3.8 D9, departing
 * from Phase 3 Addendum #7): reports against crisis-flagged or soft-deleted
 * posts ARE valid moderator-queue signal.
 *
 * <p>Reports do NOT fire activity events, do NOT award faith points, and
 * do NOT bump {@code last_activity_at} (D7 + D8 — gamifying reports would
 * create perverse incentives).
 *
 * <p>Logging policy (D12 + Watch-For #2): log only ids, target type,
 * reason, and status. NEVER log the {@code details} content — it may
 * contain user-identifying or sensitive context about the reported user.
 */
@Service
@Transactional(readOnly = true)
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    public enum TargetType { POST, COMMENT }

    public record ReportResult(ReportData data, boolean created) {}

    private final ReportRepository reportRepository;
    private final ReportsRateLimitService rateLimitService;
    private final EntityManager entityManager;

    public ReportService(ReportRepository reportRepository,
                         ReportsRateLimitService rateLimitService,
                         EntityManager entityManager) {
        this.reportRepository = reportRepository;
        this.rateLimitService = rateLimitService;
        this.entityManager = entityManager;
    }

    @Transactional
    public ReportResult report(TargetType targetType,
                               UUID targetId,
                               UUID reporterId,
                               CreateReportRequest request,
                               String requestId) {
        rateLimitService.checkAndConsume(reporterId);

        UUID authorId = loadTargetAuthorId(targetType, targetId);
        if (reporterId.equals(authorId)) {
            throw new SelfReportException();
        }

        Optional<Report> existing = (targetType == TargetType.POST)
                ? reportRepository.findPendingByReporterAndPostForUpdate(reporterId, targetId)
                : reportRepository.findPendingByReporterAndCommentForUpdate(reporterId, targetId);

        Report report;
        boolean created;
        if (existing.isPresent()) {
            report = existing.get();
            created = false;
        } else {
            report = new Report(
                    reporterId,
                    targetType == TargetType.POST ? targetId : null,
                    targetType == TargetType.COMMENT ? targetId : null,
                    request.reason(),
                    request.details());
            report = reportRepository.save(report);
            created = true;
        }

        log.info("Report submitted reporterId={} targetType={} targetId={} reason={} status={} requestId={}",
                reporterId, targetType.name().toLowerCase(), targetId,
                request.reason().name().toLowerCase(),
                created ? "created" : "idempotent",
                requestId);

        return new ReportResult(new ReportData(report.getId(), created), created);
    }

    /**
     * Loads the target post/comment with PESSIMISTIC_WRITE lock so concurrent
     * report submissions against the same target serialize. Without locking on
     * an EXISTING row (the parent), the pessimistic lock on the find-pending
     * query is ineffective — Postgres' {@code SELECT ... FOR UPDATE} on an
     * empty result set acquires no row locks. Schema has no UNIQUE on
     * (reporter_id, post_id) per MPD-1; locking the parent is the only
     * reliable way to prevent duplicate inserts under concurrency.
     */
    private UUID loadTargetAuthorId(TargetType targetType, UUID targetId) {
        if (targetType == TargetType.POST) {
            Post post = entityManager.find(Post.class, targetId, LockModeType.PESSIMISTIC_WRITE);
            if (post == null) {
                throw new ReportTargetNotFoundException();
            }
            return post.getUserId();
        } else {
            PostComment comment = entityManager.find(PostComment.class, targetId, LockModeType.PESSIMISTIC_WRITE);
            if (comment == null) {
                throw new ReportTargetNotFoundException();
            }
            return comment.getUserId();
        }
    }
}
