package com.worshiproom.post.report;

import com.worshiproom.activity.ActivityLogRepository;
import com.worshiproom.activity.FaithPointsRepository;
import com.worshiproom.post.report.dto.CreateReportRequest;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spec 3.8 — service-layer integration tests for {@link ReportService}.
 *
 * <p>Override the rate limit to a high value (1000/hour) so token-consuming
 * test cases don't trip the limit; rate-limit-specific tests live in
 * {@link ReportsRateLimitServiceTest}.
 */
class ReportServiceTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("worshiproom.reports.rate-limit.max-per-hour", () -> "1000");
    }

    @Autowired private ReportService service;
    @Autowired private ReportRepository reportRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ActivityLogRepository activityLogRepository;
    @Autowired private FaithPointsRepository faithPointsRepository;
    @Autowired private JdbcTemplate jdbc;

    private User alice;
    private User bob;
    private UUID alicePostId;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM activity_log");
        jdbc.update("DELETE FROM friend_relationships");
        jdbc.update("DELETE FROM post_reports");
        jdbc.update("DELETE FROM post_reactions");
        jdbc.update("DELETE FROM post_bookmarks");
        jdbc.update("DELETE FROM post_comments");
        jdbc.update("DELETE FROM posts");
        jdbc.update("DELETE FROM users");

        alice = userRepository.saveAndFlush(new User(
                "alice-rep-svc-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Alice", "Anderson", "UTC"));
        bob = userRepository.saveAndFlush(new User(
                "bob-rep-svc-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local",
                "$2a$10$x", "Bob", "Bennett", "UTC"));

        alicePostId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO posts (id, user_id, post_type, content, visibility, moderation_status,
                                   is_deleted)
                VALUES (?, ?, 'prayer_request', 'svc test', 'public', 'approved', FALSE)
                """, alicePostId, alice.getId());
    }

    private CreateReportRequest spamRequest() {
        return new CreateReportRequest(ReportReason.SPAM, "looks like spam");
    }

    @Test
    void report_pendingExists_returnsExistingReportIdNoNewRow() {
        ReportService.ReportResult first = service.report(
                ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req-1");
        assertThat(first.created()).isTrue();
        UUID firstId = first.data().reportId();

        ReportService.ReportResult second = service.report(
                ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req-2");
        assertThat(second.created()).isFalse();
        assertThat(second.data().reportId()).isEqualTo(firstId);

        assertThat(reportRepository.count()).isEqualTo(1);
    }

    @Test
    void report_closedReportExists_insertsNewPendingRow() {
        // Insert a dismissed report directly via JDBC to bypass JPA (which would refuse
        // to create a closed-status report without reviewer fields).
        UUID dismissedId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO post_reports (id, post_id, reporter_id, reason, status,
                                          reviewer_id, reviewed_at)
                VALUES (?, ?, ?, 'spam', 'dismissed', ?, NOW())
                """, dismissedId, alicePostId, bob.getId(), alice.getId());

        ReportService.ReportResult result = service.report(
                ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req-1");
        assertThat(result.created()).isTrue();
        assertThat(result.data().reportId()).isNotEqualTo(dismissedId);
        assertThat(reportRepository.count()).isEqualTo(2);
    }

    @Test
    void report_concurrentDuplicates_pessimisticLockPreventsTwoRows() throws Exception {
        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        AtomicReference<UUID> firstId = new AtomicReference<>();
        AtomicReference<UUID> secondId = new AtomicReference<>();
        AtomicReference<Boolean> firstCreated = new AtomicReference<>();
        AtomicReference<Boolean> secondCreated = new AtomicReference<>();

        Runnable submit = () -> {
            ready.countDown();
            try {
                start.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            ReportService.ReportResult r = service.report(
                    ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req");
            // Race-safe assignment: whichever thread arrives first owns firstId.
            if (firstId.compareAndSet(null, r.data().reportId())) {
                firstCreated.set(r.created());
            } else {
                secondId.set(r.data().reportId());
                secondCreated.set(r.created());
            }
        };

        executor.submit(submit);
        executor.submit(submit);
        ready.await(5, TimeUnit.SECONDS);
        start.countDown();
        executor.shutdown();
        executor.awaitTermination(15, TimeUnit.SECONDS);

        // Exactly one row in DB despite two concurrent submits.
        assertThat(reportRepository.count()).isEqualTo(1);
        // Both threads observed the same report id.
        assertThat(secondId.get()).isEqualTo(firstId.get());
        // Exactly one had created=true (the first to acquire the lock).
        assertThat(firstCreated.get()).isNotEqualTo(secondCreated.get());
    }

    @Test
    void report_selfReport_throwsSelfReportException() {
        assertThatThrownBy(() -> service.report(
                ReportService.TargetType.POST, alicePostId, alice.getId(), spamRequest(), "req"))
                .isInstanceOf(SelfReportException.class);
        assertThat(reportRepository.count()).isZero();
    }

    @Test
    void report_postTarget_setsPostIdNullsCommentId() {
        service.report(ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req");
        Integer postIdMatches = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reports WHERE post_id = ? AND comment_id IS NULL",
                Integer.class, alicePostId);
        assertThat(postIdMatches).isEqualTo(1);
    }

    @Test
    void report_commentTarget_setsCommentIdNullsPostId() {
        UUID commentId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO post_comments (id, post_id, user_id, content)
                VALUES (?, ?, ?, 'comment to report')
                """, commentId, alicePostId, alice.getId());

        service.report(ReportService.TargetType.COMMENT, commentId, bob.getId(), spamRequest(), "req");
        Integer commentIdMatches = jdbc.queryForObject(
                "SELECT COUNT(*) FROM post_reports WHERE comment_id = ? AND post_id IS NULL",
                Integer.class, commentId);
        assertThat(commentIdMatches).isEqualTo(1);
    }

    @Test
    void report_doesNotFireActivityEvent() {
        service.report(ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req");
        // D7: reports never fire activity events.
        assertThat(activityLogRepository.count()).isZero();
    }

    @Test
    void report_doesNotAwardFaithPoints() {
        long before = faithPointsRepository.count();
        service.report(ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req");
        // D7: reports never award faith points (no row created, no row mutated).
        assertThat(faithPointsRepository.count()).isEqualTo(before);
    }

    @Test
    void report_doesNotBumpPostLastActivityAt() {
        OffsetDateTime before = jdbc.queryForObject(
                "SELECT last_activity_at FROM posts WHERE id = ?",
                OffsetDateTime.class, alicePostId);
        service.report(ReportService.TargetType.POST, alicePostId, bob.getId(), spamRequest(), "req");
        OffsetDateTime after = jdbc.queryForObject(
                "SELECT last_activity_at FROM posts WHERE id = ?",
                OffsetDateTime.class, alicePostId);
        // D8: a reported post must not jump to the top of the feed.
        assertThat(after).isEqualTo(before);
    }
}
