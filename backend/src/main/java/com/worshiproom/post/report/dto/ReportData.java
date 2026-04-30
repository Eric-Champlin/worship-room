package com.worshiproom.post.report.dto;

import java.util.UUID;

/**
 * Response payload for the report-write endpoints. {@code created} is
 * {@code true} when a new pending row was inserted, {@code false} when
 * an existing pending report was returned (idempotent semantics per
 * Spec 3.8 D4).
 */
public record ReportData(UUID reportId, boolean created) {}
