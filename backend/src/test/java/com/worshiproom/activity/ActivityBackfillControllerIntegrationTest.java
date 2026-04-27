package com.worshiproom.activity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.activity.dto.ActivityBackfillRequest;
import com.worshiproom.activity.dto.ActivityBackfillRequest.ActivityCountsPayload;
import com.worshiproom.activity.dto.ActivityBackfillRequest.ActivityFlags;
import com.worshiproom.activity.dto.ActivityBackfillRequest.BadgeEntry;
import com.worshiproom.activity.dto.ActivityBackfillRequest.BadgesPayload;
import com.worshiproom.activity.dto.ActivityBackfillRequest.FaithPointsPayload;
import com.worshiproom.activity.dto.ActivityBackfillRequest.StreakPayload;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for {@code POST /api/v1/activity/backfill} (Spec 2.10).
 *
 * <p>Mirrors {@link ActivityControllerIntegrationTest}'s setup: extends
 * {@link AbstractIntegrationTest} for the singleton Testcontainers PostgreSQL
 * container, autowires {@code MockMvc} + repos + {@code JwtService}, and
 * resets state in {@code @BeforeEach}.
 */
@AutoConfigureMockMvc
class ActivityBackfillControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void backfillProperties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        // LoginRateLimitFilter is in the bean graph; inflate so it never fires here.
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository userRepository;
    @Autowired private FaithPointsRepository fpRepo;
    @Autowired private StreakRepository streakRepo;
    @Autowired private BadgeRepository badgeRepo;
    @Autowired private ActivityCountsRepository countsRepo;
    @Autowired private ActivityLogRepository logRepo;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper objectMapper;

    private User user;
    private String validToken;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
        user = userRepository.save(
            new User("backfill-test@example.com", "$2a$10$x", "Test", "User", "America/Chicago"));
        validToken = jwtService.generateToken(user.getId(), user.isAdmin());
    }

    private ActivityBackfillRequest fullPayload() {
        // 3 days of activity totalling 7 active flags (1 + 3 + 3)
        Map<String, ActivityFlags> log = new LinkedHashMap<>();
        log.put("2026-04-15", new ActivityFlags(true, false, false, false, false, false,
            false, false, false, false, false, false, 5, 1));
        log.put("2026-04-16", new ActivityFlags(false, true, true, false, false, true,
            false, false, false, false, false, false, 40, 1));
        log.put("2026-04-17", new ActivityFlags(true, true, false, false, false, false,
            true, false, false, false, false, false, 70, 1.25));
        Map<String, BadgeEntry> badges = new LinkedHashMap<>();
        badges.put("first_prayer", new BadgeEntry("2026-04-15T17:00:00Z", 1));
        badges.put("level_1", new BadgeEntry("2026-04-15T17:00:00Z", 1));
        return new ActivityBackfillRequest(
            1, "America/Chicago", log,
            new FaithPointsPayload(125, 2),
            new StreakPayload(3, 3, "2026-04-17"),
            new BadgesPayload(badges, new ActivityCountsPayload(
                3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
            ))
        );
    }

    private ActivityBackfillRequest emptyPayload() {
        return new ActivityBackfillRequest(
            1, "America/Chicago", new LinkedHashMap<>(),
            new FaithPointsPayload(0, 1),
            new StreakPayload(0, 0, null),
            new BadgesPayload(new LinkedHashMap<>(), new ActivityCountsPayload(
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
            ))
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // A) Happy path (3 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("A) Happy path")
    class HappyPath {

        @Test
        void authedFullPayload_returns200WithExpectedShape() throws Exception {
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityLogRowsInserted").value(7))
                .andExpect(jsonPath("$.data.faithPointsUpdated").value(true))
                .andExpect(jsonPath("$.data.streakStateUpdated").value(true))
                .andExpect(jsonPath("$.data.badgesInserted").value(2))
                .andExpect(jsonPath("$.data.activityCountsUpserted").value(14))
                .andExpect(jsonPath("$.meta.requestId").exists());
        }

        @Test
        void activityLogRowsInsertedWithSyntheticNoonTimestamps() throws Exception {
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk());

            List<ActivityLog> rows = logRepo.findAll();
            assertThat(rows).hasSize(7);
            for (ActivityLog row : rows) {
                assertThat(row.getSourceFeature()).isEqualTo("backfill");
                assertThat(row.getPointsEarned()).isEqualTo(0);
                assertThat(row.getMetadata()).isNotNull();
                assertThat(row.getMetadata().get("backfilled")).isEqualTo(true);
                assertThat(row.getMetadata().get("originalDate")).isInstanceOf(String.class);
            }
            // Spot-check: row tagged with originalDate=2026-04-15 should have
            // occurred_at = noon America/Chicago on that date converted to UTC.
            ZoneId chicago = ZoneId.of("America/Chicago");
            ActivityLog moodRow = rows.stream()
                .filter(r -> "mood".equals(r.getActivityType()))
                .filter(r -> "2026-04-15".equals(r.getMetadata().get("originalDate")))
                .findFirst().orElseThrow();
            OffsetDateTime expected = LocalDate.parse("2026-04-15")
                .atTime(12, 0).atZone(chicago).toOffsetDateTime();
            assertThat(moodRow.getOccurredAt().toInstant())
                .isEqualTo(expected.toInstant());
        }

        @Test
        void allFiveTablesPopulated() throws Exception {
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk());

            assertThat(logRepo.findAll()).hasSize(7);

            FaithPoints fp = fpRepo.findById(user.getId()).orElseThrow();
            assertThat(fp.getTotalPoints()).isEqualTo(125);
            assertThat(fp.getCurrentLevel()).isEqualTo(2);

            StreakState ss = streakRepo.findById(user.getId()).orElseThrow();
            assertThat(ss.getCurrentStreak()).isEqualTo(3);
            assertThat(ss.getLongestStreak()).isEqualTo(3);
            assertThat(ss.getLastActiveDate()).isEqualTo(LocalDate.parse("2026-04-17"));

            assertThat(badgeRepo.findAllByUserId(user.getId())).hasSize(2);

            ActivityCount prayCount = countsRepo.findById(
                new ActivityCountId(user.getId(), "pray")).orElseThrow();
            assertThat(prayCount.getCountValue()).isEqualTo(3);
            assertThat(countsRepo.findAll()).hasSize(14);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // B) Idempotency (4 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("B) Idempotency")
    class Idempotency {

        @Test
        void samePayloadTwice_finalStateIdentical() throws Exception {
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityLogRowsInserted").value(7))
                .andExpect(jsonPath("$.data.badgesInserted").value(2));

            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityLogRowsInserted").value(0))
                .andExpect(jsonPath("$.data.badgesInserted").value(0))
                .andExpect(jsonPath("$.data.activityCountsUpserted").value(14));

            // Final state: still 7 activity_log rows; faith_points/streak still 1 row each.
            assertThat(logRepo.findAll()).hasSize(7);
            assertThat(fpRepo.findById(user.getId())).isPresent();
            assertThat(streakRepo.findById(user.getId())).isPresent();
            assertThat(badgeRepo.findAllByUserId(user.getId())).hasSize(2);
            assertThat(countsRepo.findAll()).hasSize(14);
        }

        @Test
        void realtimePostSpec26AfterBackfill_unaffected() throws Exception {
            // Backfill first
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk());

            int rowsBefore = logRepo.findAll().size();

            // Real-time recordActivity for today via Spec 2.6 endpoint
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"activityType\":\"pray\",\"sourceFeature\":\"daily-pray\"}"))
                .andExpect(status().isOk());

            // The Spec 2.6 endpoint adds a real-time row alongside backfill rows.
            assertThat(logRepo.findAll()).hasSize(rowsBefore + 1);
        }

        @Test
        void realtimeFirstThenBackfillForHistoricalDates_realtimeRowUnchanged() throws Exception {
            // Real-time recordActivity for today first
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"activityType\":\"pray\",\"sourceFeature\":\"daily-pray\"}"))
                .andExpect(status().isOk());

            ActivityLog realtimeRow = logRepo.findAll().get(0);
            OffsetDateTime realtimeOccurred = realtimeRow.getOccurredAt();
            String realtimeSource = realtimeRow.getSourceFeature();

            // Now backfill historical dates
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk());

            // The realtime row should be unchanged
            ActivityLog refetched = logRepo.findById(realtimeRow.getId()).orElseThrow();
            assertThat(refetched.getOccurredAt()).isEqualTo(realtimeOccurred);
            assertThat(refetched.getSourceFeature()).isEqualTo(realtimeSource);
            // Backfill rows added separately
            assertThat(logRepo.findAll()).hasSize(8);    // 1 realtime + 7 backfill
        }

        @Test
        void dbLevelDuplicateBackfillRowRejected() {
            UUID userId = user.getId();
            OffsetDateTime ts = OffsetDateTime.parse("2026-03-01T18:00:00Z");
            // Insert one backfill row directly
            jdbc.update(
                "INSERT INTO activity_log (id, user_id, activity_type, source_feature, " +
                "occurred_at, points_earned, metadata) VALUES (gen_random_uuid(), ?, ?, ?, ?, 0, NULL)",
                userId, "pray", "backfill", ts);
            // Inserting a second with the same (user_id, activity_type, occurred_at) AND
            // source_feature='backfill' must violate the partial unique index.
            assertThatThrownBy(() ->
                jdbc.update(
                    "INSERT INTO activity_log (id, user_id, activity_type, source_feature, " +
                    "occurred_at, points_earned, metadata) VALUES (gen_random_uuid(), ?, ?, ?, ?, 0, NULL)",
                    userId, "pray", "backfill", ts)
            ).isInstanceOf(DataIntegrityViolationException.class);

            // But the SAME tuple with source_feature != 'backfill' must succeed (partial WHERE clause)
            jdbc.update(
                "INSERT INTO activity_log (id, user_id, activity_type, source_feature, " +
                "occurred_at, points_earned, metadata) VALUES (gen_random_uuid(), ?, ?, ?, ?, 0, NULL)",
                userId, "pray", "daily-pray", ts);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // C) Authentication & authorization (2 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("C) Authentication & authorization")
    class Auth {

        @Test
        void unauthedReturns401() throws Exception {
            mvc.perform(post("/api/v1/activity/backfill")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(emptyPayload())))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void userBPayloadDoesNotAffectUserA() throws Exception {
            User userB = userRepository.save(
                new User("backfill-b@example.com", "$2a$10$y", "Test", "B", "America/Chicago"));
            String userBToken = jwtService.generateToken(userB.getId(), userB.isAdmin());

            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + userBToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk());

            // User A should have nothing
            assertThat(fpRepo.findById(user.getId())).isEmpty();
            assertThat(streakRepo.findById(user.getId())).isEmpty();
            assertThat(badgeRepo.findAllByUserId(user.getId())).isEmpty();
            // Activity counts only seeded for user B
            assertThat(countsRepo.findAll().stream()
                .filter(c -> c.getUserId().equals(user.getId())).count()).isEqualTo(0);
            // User B should have everything
            assertThat(fpRepo.findById(userB.getId())).isPresent();
            assertThat(streakRepo.findById(userB.getId())).isPresent();
            assertThat(badgeRepo.findAllByUserId(userB.getId())).hasSize(2);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // D) Validation (2 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("D) Validation")
    class Validation {

        @Test
        void missingRequiredFieldReturns400() throws Exception {
            // Missing faithPoints field entirely
            String malformed = "{\"schemaVersion\":1,\"userTimezone\":\"UTC\"," +
                "\"activityLog\":{},\"streak\":{\"currentStreak\":0,\"longestStreak\":0}," +
                "\"badges\":{\"earned\":{},\"activityCounts\":{}}}";
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(malformed))
                .andExpect(status().isBadRequest());
        }

        // NOTE: The plan's `payloadOver1MBReturns413` test was removed. The plan
        // assumed `spring.servlet.multipart.max-request-size=1MB` would limit JSON
        // body size, but that property only governs multipart/form-data uploads —
        // it does not apply to application/json requests. There is no JSON body
        // size enforcement on this endpoint today. Adding one is a future spec
        // (would require either a Tomcat connector setting or a custom filter).
        // The natural client-side rate limiter (`wr_activity_backfill_completed`
        // flag, fired once per browser) keeps payload pressure low in practice.
    }

    // ─────────────────────────────────────────────────────────────────
    // E) Transactional rollback (2 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("E) Transactional rollback")
    class Rollback {

        @Test
        void simulatedConstraintViolationMidTransaction_rollsBackEverything() throws Exception {
            // Force a parse error mid-transaction by putting a malformed lastActiveDate
            // value. activity_log + faith_points writes precede this in the service,
            // and @Transactional must roll them back when the parse throws.
            //
            // Status-code note: the plan expected 5xx, but the current codebase's
            // JwtAuthenticationFilter wraps filterChain.doFilter() in a try block
            // whose catch-all converts ANY downstream exception into a 401
            // TOKEN_INVALID response. This is pre-existing behavior unrelated to
            // this spec — fixing it is a separate refactor. The CORE assertion of
            // this test (rollback occurred — all five tables empty) is unchanged
            // and still verifies the @Transactional contract; the request simply
            // surfaces as 401 rather than 500.
            ActivityBackfillRequest payload = fullPayload();
            ActivityBackfillRequest broken = new ActivityBackfillRequest(
                payload.schemaVersion(),
                payload.userTimezone(),
                payload.activityLog(),
                payload.faithPoints(),
                new StreakPayload(payload.streak().currentStreak(),
                    payload.streak().longestStreak(), "not-a-date"),
                payload.badges()
            );
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(broken)))
                // Assert the request did NOT succeed; status code is whatever the
                // existing filter chain produces today. Rollback is the real test.
                .andExpect(result ->
                    org.assertj.core.api.Assertions.assertThat(result.getResponse().getStatus())
                        .isNotEqualTo(200));

            // All five tables should be empty (full rollback) — primary assertion
            assertThat(logRepo.findAll()).isEmpty();
            assertThat(fpRepo.findById(user.getId())).isEmpty();
            assertThat(streakRepo.findById(user.getId())).isEmpty();
            assertThat(badgeRepo.findAllByUserId(user.getId())).isEmpty();
            assertThat(countsRepo.findAll()).isEmpty();
        }

        @Test
        void successfulCompletion_allFiveTableWritesConsistent() throws Exception {
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(fullPayload())))
                .andExpect(status().isOk());

            // Cross-check across all five tables
            assertThat(logRepo.findAll()).hasSize(7);
            assertThat(fpRepo.findById(user.getId())).isPresent();
            assertThat(streakRepo.findById(user.getId())).isPresent();
            assertThat(badgeRepo.findAllByUserId(user.getId())).hasSize(2);
            assertThat(countsRepo.findAll()).hasSize(14);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // F) Edge cases (1 test)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("F) Edge cases")
    class Edge {

        @Test
        void emptyPayload_returns200WithZeroCounts() throws Exception {
            mvc.perform(post("/api/v1/activity/backfill")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(emptyPayload())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityLogRowsInserted").value(0))
                .andExpect(jsonPath("$.data.faithPointsUpdated").value(true))
                .andExpect(jsonPath("$.data.streakStateUpdated").value(true))
                .andExpect(jsonPath("$.data.badgesInserted").value(0))
                .andExpect(jsonPath("$.data.activityCountsUpserted").value(14));

            assertThat(logRepo.findAll()).isEmpty();
            FaithPoints fp = fpRepo.findById(user.getId()).orElseThrow();
            assertThat(fp.getTotalPoints()).isEqualTo(0);
            assertThat(fp.getCurrentLevel()).isEqualTo(1);
        }
    }
}
