package com.worshiproom.post.report;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link Report}. The pessimistic-lock queries back the
 * idempotent dedup-on-pending policy in {@code ReportService}: under
 * concurrent submissions from the same reporter against the same target,
 * one transaction observes (and locks) the existing pending row while the
 * other waits, ensuring exactly one pending row is created.
 *
 * <p>The {@code post_reports} schema (Spec 3.1 changeset 018, MPD-1) does
 * NOT carry a UNIQUE constraint on (reporter_id, post_id) or
 * (reporter_id, comment_id), so the lock is the only thing that prevents a
 * race-condition double insert.
 */
@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT r FROM Report r
             WHERE r.reporterId = :reporterId
               AND r.postId = :postId
               AND r.status = com.worshiproom.post.report.ReportStatus.PENDING
            """)
    Optional<Report> findPendingByReporterAndPostForUpdate(
            @Param("reporterId") UUID reporterId,
            @Param("postId") UUID postId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT r FROM Report r
             WHERE r.reporterId = :reporterId
               AND r.commentId = :commentId
               AND r.status = com.worshiproom.post.report.ReportStatus.PENDING
            """)
    Optional<Report> findPendingByReporterAndCommentForUpdate(
            @Param("reporterId") UUID reporterId,
            @Param("commentId") UUID commentId);
}
