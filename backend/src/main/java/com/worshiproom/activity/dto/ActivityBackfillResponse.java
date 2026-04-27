package com.worshiproom.activity.dto;

/**
 * Inner payload for {@code POST /api/v1/activity/backfill} response envelope.
 * Wrapped by {@link com.worshiproom.proxy.common.ProxyResponse} in the controller.
 *
 * <p>Counts are honest about what was actually written:
 * <ul>
 *   <li>{@code activityLogRowsInserted} — rows actually inserted (may be less
 *       than payload size on retries due to ON CONFLICT DO NOTHING).</li>
 *   <li>{@code faithPointsUpdated} — always true (UPSERT always writes).</li>
 *   <li>{@code streakStateUpdated} — always true.</li>
 *   <li>{@code badgesInserted} — rows actually inserted (excludes pre-existing
 *       on retries via ON CONFLICT DO NOTHING).</li>
 *   <li>{@code activityCountsUpserted} — always 14 (always writes all 14
 *       counters with values from the payload, even if 0).</li>
 * </ul>
 */
public record ActivityBackfillResponse(
    int activityLogRowsInserted,
    boolean faithPointsUpdated,
    boolean streakStateUpdated,
    int badgesInserted,
    int activityCountsUpserted
) {}
