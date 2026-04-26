package com.worshiproom.activity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Persistence-layer service for the {@code activity_counts} table.
 *
 * <p>Exposes three operations over per-user counters:
 * <ul>
 *   <li>{@link #incrementCount} — atomic UPSERT (no race window)</li>
 *   <li>{@link #getCount} — read with default-zero semantics for missing rows</li>
 *   <li>{@link #getAllCounts} — read all rows, zero-fill every {@link CountType}</li>
 * </ul>
 *
 * <p>Different posture from Specs 2.2/2.3/2.4 services: this one has
 * constructor-injected dependencies, touches the database, uses
 * {@code @Transactional}, and is tested against real Testcontainers
 * PostgreSQL rather than mocks. Per Spec 2.5 Architectural Decision #1.
 *
 * <p>The {@code activity_type → count_type} mapping is intentionally NOT
 * here — it lives at the call site in Spec 2.6's controller. This service
 * only knows: "given a {@link CountType}, increment its counter." Per Spec
 * 2.5 Architectural Decision #7.
 *
 * <p>{@link #getAllCounts} is resilient to rogue rows (DB strings that
 * don't map to any {@link CountType}). It logs a WARN and skips the row
 * rather than throwing — one rogue row should not break every consumer's
 * {@code getAllCounts} call. Per Spec 2.5 Architectural Decision #4.
 */
@Service
public class ActivityCountsService {

    private static final Logger log = LoggerFactory.getLogger(ActivityCountsService.class);

    private final ActivityCountsRepository repo;

    public ActivityCountsService(ActivityCountsRepository repo) {
        this.repo = repo;
    }

    /**
     * Atomically increment the counter for {@code (userId, countType)} by 1.
     * Creates the row at value 1 if it doesn't exist; otherwise increments
     * the existing value. {@code last_updated} is refreshed to NOW().
     *
     * <p>Concurrent calls for the same key are linearized by PostgreSQL's
     * UPSERT — 100 simultaneous calls produce {@code count_value = 100}
     * deterministically.
     */
    @Transactional
    public void incrementCount(UUID userId, CountType countType) {
        repo.incrementCount(userId, countType.wireValue());
    }

    /**
     * Return the current count value for {@code (userId, countType)}, or
     * {@code 0} if no row exists. Never returns {@code null}.
     */
    @Transactional(readOnly = true)
    public int getCount(UUID userId, CountType countType) {
        return repo.findById(new ActivityCountId(userId, countType.wireValue()))
                   .map(ActivityCount::getCountValue)
                   .orElse(0);
    }

    /**
     * Return a map keyed by every {@link CountType}. Counters with no row
     * in the database appear with value {@code 0}; counters with a row
     * appear with their stored value.
     *
     * <p>Rogue {@code count_type} strings in the DB (rows whose value
     * does not map to any {@link CountType}) are logged at WARN level
     * and skipped. The returned map ALWAYS has every {@link CountType}
     * as a key — Spec 2.6 relies on this invariant when assembling
     * the {@code ActivityCountsSnapshot} for {@code BadgeService.checkBadges}.
     */
    @Transactional(readOnly = true)
    public Map<CountType, Integer> getAllCounts(UUID userId) {
        List<ActivityCount> rows = repo.findAllByUserId(userId);
        Map<CountType, Integer> result = new EnumMap<>(CountType.class);
        for (CountType type : CountType.values()) {
            result.put(type, 0);
        }
        for (ActivityCount row : rows) {
            CountType.fromWireValue(row.getCountType()).ifPresentOrElse(
                type -> result.put(type, row.getCountValue()),
                () -> log.warn("Skipping unknown count_type='{}' in activity_counts for userId={} (likely future-version drift)",
                    row.getCountType(), userId)
            );
        }
        return result;
    }
}
