package com.worshiproom.activity;

import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ActivityCountsServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private ActivityCountsService service;

    @Autowired
    private ActivityCountsRepository repo;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID userId;
    private UUID otherUserId;

    @BeforeEach
    void setup() {
        // Singleton container is shared across the JVM run. Clean up rows from prior
        // test classes so this suite starts deterministically. CASCADE FK on
        // activity_counts.user_id transitively clears all counts rows.
        userRepository.deleteAll();

        User u1 = userRepository.save(new User(
            "counts-test-1@example.com", "$2a$10$x", "Test", "One", "UTC"));
        User u2 = userRepository.save(new User(
            "counts-test-2@example.com", "$2a$10$x", "Test", "Two", "UTC"));
        userId = u1.getId();
        otherUserId = u2.getId();
    }

    // ------------------------------------------------------------
    // incrementCount semantics
    // ------------------------------------------------------------

    @Test
    void incrementCount_freshKey_createsRowWithValueOne() {
        service.incrementCount(userId, CountType.PRAY);
        assertThat(service.getCount(userId, CountType.PRAY)).isEqualTo(1);
    }

    @Test
    void incrementCount_existingRow_incrementsByOne() {
        // Pre-seed via JDBC to value 5 (bypass the service to isolate the increment behavior)
        jdbcTemplate.update(
            "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) VALUES (?, ?, ?, NOW())",
            userId, "pray", 5);
        service.incrementCount(userId, CountType.PRAY);
        assertThat(service.getCount(userId, CountType.PRAY)).isEqualTo(6);
    }

    @Test
    void incrementCount_tenSequentialCalls_producesValueTen() {
        for (int i = 0; i < 10; i++) {
            service.incrementCount(userId, CountType.JOURNAL);
        }
        assertThat(service.getCount(userId, CountType.JOURNAL)).isEqualTo(10);
    }

    @Test
    void incrementCount_differentCountTypesForSameUser_stayIndependent() {
        service.incrementCount(userId, CountType.PRAY);
        service.incrementCount(userId, CountType.PRAY);
        service.incrementCount(userId, CountType.PRAY);
        service.incrementCount(userId, CountType.JOURNAL);
        service.incrementCount(userId, CountType.JOURNAL);

        assertThat(service.getCount(userId, CountType.PRAY)).isEqualTo(3);
        assertThat(service.getCount(userId, CountType.JOURNAL)).isEqualTo(2);
        assertThat(service.getCount(userId, CountType.MEDITATE)).isEqualTo(0);
    }

    @Test
    void incrementCount_sameCountTypeForDifferentUsers_staysIndependent() {
        for (int i = 0; i < 5; i++) service.incrementCount(userId, CountType.PRAY);
        for (int i = 0; i < 2; i++) service.incrementCount(otherUserId, CountType.PRAY);

        assertThat(service.getCount(userId, CountType.PRAY)).isEqualTo(5);
        assertThat(service.getCount(otherUserId, CountType.PRAY)).isEqualTo(2);
    }

    @Test
    void incrementCount_refreshesLastUpdatedTimestamp() throws InterruptedException {
        service.incrementCount(userId, CountType.PRAY);
        OffsetDateTime firstWrite = repo.findById(
            new ActivityCountId(userId, "pray")).orElseThrow().getLastUpdated();

        // Sleep briefly so NOW() advances at the DB layer
        Thread.sleep(50);

        service.incrementCount(userId, CountType.PRAY);
        OffsetDateTime secondWrite = repo.findById(
            new ActivityCountId(userId, "pray")).orElseThrow().getLastUpdated();

        assertThat(secondWrite).isAfter(firstWrite);
    }

    // ------------------------------------------------------------
    // getCount semantics
    // ------------------------------------------------------------

    @Test
    void getCount_returnsZeroForMissingRow() {
        assertThat(service.getCount(userId, CountType.GRATITUDE)).isEqualTo(0);
    }

    @Test
    void getCount_returnsCurrentValueForExistingRow() {
        jdbcTemplate.update(
            "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) VALUES (?, ?, ?, NOW())",
            userId, "bibleChaptersRead", 42);
        assertThat(service.getCount(userId, CountType.BIBLE_CHAPTERS_READ)).isEqualTo(42);
    }

    // ------------------------------------------------------------
    // getAllCounts semantics
    // ------------------------------------------------------------

    @Test
    void getAllCounts_returnsAllFifteenKeysWithZeroFillForAbsentRows() {
        jdbcTemplate.update(
            "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) VALUES (?, ?, ?, NOW())",
            userId, "pray", 7);
        jdbcTemplate.update(
            "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) VALUES (?, ?, ?, NOW())",
            userId, "journal", 3);

        Map<CountType, Integer> all = service.getAllCounts(userId);
        assertThat(all).hasSize(15);
        assertThat(all).containsKeys(CountType.values());
        assertThat(all.get(CountType.PRAY)).isEqualTo(7);
        assertThat(all.get(CountType.JOURNAL)).isEqualTo(3);
        assertThat(all.get(CountType.MEDITATE)).isEqualTo(0);
        assertThat(all.get(CountType.PRAYER_WALL_POSTS)).isEqualTo(0);
    }

    @Test
    void getAllCounts_skipsRogueWireValueAndKeepsValidRows() {
        // Insert a valid row + a rogue row whose count_type doesn't map to any CountType
        jdbcTemplate.update(
            "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) VALUES (?, ?, ?, NOW())",
            userId, "pray", 4);
        jdbcTemplate.update(
            "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) VALUES (?, ?, ?, NOW())",
            userId, "futureSpec_unknownCounter", 99);

        Map<CountType, Integer> all = service.getAllCounts(userId);
        assertThat(all).hasSize(15);
        assertThat(all.get(CountType.PRAY)).isEqualTo(4);
        // Rogue row is skipped; map still contains all 15 keys, no crash
    }

    // ------------------------------------------------------------
    // CHECK constraint enforcement
    // ------------------------------------------------------------

    @Test
    void checkConstraint_rejectsNegativeCountValueViaDirectSqlUpdate() {
        service.incrementCount(userId, CountType.PRAY);
        assertThatThrownBy(() -> jdbcTemplate.update(
            "UPDATE activity_counts SET count_value = -1 WHERE user_id = ? AND count_type = ?",
            userId, "pray"
        )).isInstanceOf(DataIntegrityViolationException.class)
          .hasMessageContaining("activity_counts_count_value_nonneg_check");
    }

    // ------------------------------------------------------------
    // Foreign-key cascade
    // ------------------------------------------------------------

    @Test
    void foreignKeyCascade_deletingUserRemovesAllTheirCountsRows() {
        service.incrementCount(userId, CountType.PRAY);
        service.incrementCount(userId, CountType.JOURNAL);
        service.incrementCount(userId, CountType.MEDITATE);
        assertThat(repo.findAllByUserId(userId)).hasSize(3);

        userRepository.deleteById(userId);
        userRepository.flush();

        assertThat(repo.findAllByUserId(userId)).isEmpty();
    }

    // ------------------------------------------------------------
    // CONCURRENT INCREMENT TEST — load-bearing for atomicity claim
    // ------------------------------------------------------------

    @Test
    void incrementCount_oneHundredConcurrentIncrements_producesValueExactlyOneHundred() throws Exception {
        final int threads = 10;
        final int incrementsPerThread = 10;
        final int expectedTotal = threads * incrementsPerThread;

        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger failures = new AtomicInteger(0);

        for (int t = 0; t < threads; t++) {
            executor.submit(() -> {
                try {
                    start.await();
                    for (int i = 0; i < incrementsPerThread; i++) {
                        service.incrementCount(userId, CountType.PRAYER_WALL);
                    }
                } catch (Exception e) {
                    failures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        boolean finished = done.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(finished).as("All threads completed within 30s").isTrue();
        assertThat(failures.get()).as("No thread threw an exception").isZero();
        assertThat(service.getCount(userId, CountType.PRAYER_WALL))
            .as("100 concurrent increments produced exactly 100 — UPSERT atomicity holds")
            .isEqualTo(expectedTotal);
    }
}
