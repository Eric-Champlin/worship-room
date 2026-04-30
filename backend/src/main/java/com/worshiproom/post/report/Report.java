package com.worshiproom.post.report;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Maps the existing {@code post_reports} table (Spec 3.1 changeset 018,
 * relaxed in 020). XOR target invariant ({@code post_id} OR {@code comment_id})
 * is enforced at the DB layer; the {@link com.worshiproom.post.report.ReportService}
 * is responsible for setting exactly one of the two columns.
 *
 * <p>{@code id} and {@code created_at} are DB-defaulted (gen_random_uuid /
 * NOW()), so both are {@code insertable=false, updatable=false}. The service
 * does not currently surface {@code createdAt} in responses, so the L1-cache
 * trap (Phase 3 Addendum #2) does not apply.
 *
 * <p>Moderator-controlled fields ({@code reviewerId}, {@code reviewedAt},
 * {@code actionTaken}) are included for completeness so future moderation
 * specs can mutate them, but are not written by Spec 3.8.
 */
@Entity
@Table(name = "post_reports")
public class Report {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "post_id")
    private UUID postId;

    @Column(name = "comment_id")
    private UUID commentId;

    @Column(name = "reporter_id", nullable = false)
    private UUID reporterId;

    @Convert(converter = ReportReasonConverter.class)
    @Column(name = "reason", nullable = false, length = 50)
    private ReportReason reason;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Convert(converter = ReportStatusConverter.class)
    @Column(name = "status", nullable = false, length = 20)
    private ReportStatus status;

    @Column(name = "reviewer_id")
    private UUID reviewerId;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "action_taken", length = 50)
    private String actionTaken;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Report() {}

    public Report(UUID reporterId, UUID postId, UUID commentId, ReportReason reason, String details) {
        if ((postId == null) == (commentId == null)) {
            throw new IllegalArgumentException(
                    "Report target XOR violated: exactly one of postId/commentId must be non-null");
        }
        this.id = UUID.randomUUID();
        this.reporterId = reporterId;
        this.postId = postId;
        this.commentId = commentId;
        this.reason = reason;
        this.details = details;
        this.status = ReportStatus.PENDING;
    }

    public UUID getId() { return id; }
    public UUID getPostId() { return postId; }
    public UUID getCommentId() { return commentId; }
    public UUID getReporterId() { return reporterId; }
    public ReportReason getReason() { return reason; }
    public String getDetails() { return details; }
    public ReportStatus getStatus() { return status; }
    public UUID getReviewerId() { return reviewerId; }
    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public String getActionTaken() { return actionTaken; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Report other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
