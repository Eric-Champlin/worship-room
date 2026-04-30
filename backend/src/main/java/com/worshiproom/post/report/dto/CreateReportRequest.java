package com.worshiproom.post.report.dto;

import com.worshiproom.post.report.ReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/posts/{postId}/reports} and
 * {@code POST /api/v1/comments/{commentId}/reports}.
 *
 * <p>{@code details} is plain text — no HTML, no Markdown rendering. The
 * 500-character cap is the canonical limit (matches frontend ReportDialog
 * CharacterCount).
 *
 * <p><b>HTML-strip carve-out (deliberate):</b> {@code 02-security.md}'s
 * defensive {@code <...>}-tag stripping rule applies to "Prayer Wall Posts &amp;
 * Journal Entries" — content rendered into a public feed where stripping is a
 * real XSS guard. {@code details} here is moderator-only signal with no
 * rendering surface today; eagerly stripping would silently mangle legitimate
 * user content (e.g. "the comment &lt;3 they posted was hostile" loses the
 * "&lt;3"). The Phase 10 moderator UI spec owns the strip-on-store vs
 * strip-on-display decision when a render surface lands. React's default
 * escaping covers any future render-time risk in the meantime.
 */
public record CreateReportRequest(
        @NotNull ReportReason reason,
        @Size(max = 500) String details) {}
