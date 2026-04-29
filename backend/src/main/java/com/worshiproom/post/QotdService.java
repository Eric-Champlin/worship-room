package com.worshiproom.post;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Spec 3.9 — QOTD rotation service.
 *
 * <p>Computes "today's" question by mapping {@code clock.withZone(UTC).getDayOfYear()
 * % 72} onto a {@link QotdQuestion} via {@link QotdQuestionRepository}. Caches the result
 * per {@link LocalDate} in a Caffeine cache bounded by
 * {@code worshiproom.qotd.cache.max-size} (default 2). The next request on day N+1 uses a
 * different key, so the cache lookup misses naturally and the new question loads.
 *
 * <p><b>UTC convention.</b> "Today" is computed against {@link ZoneOffset#UTC}, NOT the
 * server default zone. The {@link Clock} dependency is injected (production wiring is
 * {@code Clock.systemUTC()} via {@code QotdProperties#qotdClock()}; tests inject a fixed
 * clock) so this convention is testable without static-method mocking. This matches the
 * frontend's {@code Date.UTC(...)}-based dayOfYear computation in
 * {@code frontend/src/constants/question-of-the-day.ts}; the cross-language drift test at
 * {@code QotdDriftDetectionTest} + {@code qotd-drift.test.ts} pins the equivalence.
 *
 * <p><b>Liturgical-season awareness is DEFERRED.</b> Phase 9.2 adds a
 * {@code LiturgicalCalendarService} Java port; that spec will decorate or override
 * {@link #findForDate(LocalDate)} to return seasonal questions during named seasons.
 * Until then, 3.9 ships modulo-72 only — the spec accepts the temporary loss of seasonal
 * selection (Spec 3.9 D1).
 */
@Service
public class QotdService {

    private static final Logger log = LoggerFactory.getLogger(QotdService.class);
    private static final int POOL_SIZE = 72;

    private final QotdQuestionRepository repo;
    private final Clock clock;
    private final Cache<LocalDate, QotdQuestion> cache;

    public QotdService(QotdQuestionRepository repo, QotdProperties props, Clock clock) {
        this.repo = repo;
        this.clock = clock;
        this.cache = Caffeine.newBuilder()
                .maximumSize(props.getCache().getMaxSize())
                .build();
    }

    /**
     * Returns today's QotdQuestion. UTC date.
     *
     * @throws QotdUnavailableException when no active row exists at today's rotation slot
     */
    public QotdQuestion findTodaysQuestion() {
        LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        return findForDate(today);
    }

    /**
     * Package-private extension point for Phase 9.2. Computes the question for an arbitrary
     * date, applying the LRU cache. Direct callers must not bypass {@link #findTodaysQuestion()}
     * in production — the public method enforces the UTC convention.
     */
    QotdQuestion findForDate(LocalDate date) {
        return cache.get(date, this::computeForDate);
    }

    private QotdQuestion computeForDate(LocalDate date) {
        int displayOrderIndex = date.getDayOfYear() % POOL_SIZE;
        log.debug("QOTD lookup for date={} dayOfYear={} displayOrderIndex={}",
                  date, date.getDayOfYear(), displayOrderIndex);
        return repo.findByDisplayOrderAndIsActiveTrue(displayOrderIndex)
                .orElseThrow(QotdUnavailableException::new);
    }

    /**
     * Test-only accessor: returns the cache's configured maximum size, sourced from
     * {@code worshiproom.qotd.cache.max-size}. Caffeine's TinyLFU admission filter
     * makes per-entry eviction non-deterministic at low cardinality, so the AC
     * "cache size cap respected" is verified by asserting this getter equals the
     * configured property — proves the wiring without depending on eviction internals.
     */
    long getCacheMaximumSize() {
        return cache.policy().eviction()
                .orElseThrow(() -> new IllegalStateException(
                        "QOTD cache is not configured with a size-based eviction policy"))
                .getMaximum();
    }
}
