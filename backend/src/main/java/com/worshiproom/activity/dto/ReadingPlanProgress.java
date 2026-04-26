package com.worshiproom.activity.dto;

import java.time.LocalDateTime;

/**
 * One reading-plan progress entry. Mirrors a value in the frontend's
 * {@code wr_reading_plan_progress} (Record&lt;string, {completedAt}&gt;) map.
 *
 * @param planSlug    plan identifier
 * @param completedAt completion timestamp; {@code null} if not yet complete
 */
public record ReadingPlanProgress(String planSlug, LocalDateTime completedAt) {}
