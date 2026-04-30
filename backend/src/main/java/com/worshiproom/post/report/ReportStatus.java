package com.worshiproom.post.report;

/**
 * Lifecycle status of a moderation report (Spec 3.8).
 *
 * <p>Wire format and DB storage are lowercase via {@link ReportStatusConverter}
 * matching the {@code post_reports_status_check} CHECK constraint values:
 * pending, reviewed, dismissed, actioned.
 */
public enum ReportStatus {
    PENDING, REVIEWED, DISMISSED, ACTIONED
}
