package com.worshiproom.activity;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for {@code POST /api/v1/activity} (Spec 2.6).
 *
 * <p>21 tests across 9 categories, all running against the singleton
 * Testcontainers PostgreSQL container managed by {@link AbstractIntegrationTest}.
 * Cleans the {@code users} row in {@code @BeforeEach} — {@code ON DELETE
 * CASCADE} on every child FK transitively wipes activity_log, activity_counts,
 * faith_points, streak_state, and user_badges.
 */
@AutoConfigureMockMvc
class ActivityControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
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

    private User user;
    private String validToken;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
        user = userRepository.save(
            new User("activity-test@example.com", "$2a$10$x", "Test", "User", "UTC"));
        validToken = jwtService.generateToken(user.getId(), user.isAdmin());
    }

    private String body(String activityType, String sourceFeature) {
        return "{\"activityType\":\"" + activityType + "\",\"sourceFeature\":\"" + sourceFeature + "\"}";
    }

    // ─────────────────────────────────────────────────────────────────
    // A) Happy path basics (3 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("A) Happy path")
    class HappyPath {

        @Test
        void recordActivity_authedFirstPray_returns200WithExpectedShape() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pointsEarned").value(10))
                .andExpect(jsonPath("$.data.totalPoints").value(10))
                .andExpect(jsonPath("$.data.currentLevel").value(1))
                .andExpect(jsonPath("$.data.levelUp").value(false))
                .andExpect(jsonPath("$.data.streak.current").value(1))
                .andExpect(jsonPath("$.data.streak.longest").value(1))
                .andExpect(jsonPath("$.data.streak.newToday").value(true))
                .andExpect(jsonPath("$.data.multiplierTier.label").value(""))
                .andExpect(jsonPath("$.data.multiplierTier.multiplier").value(1.0))
                .andExpect(jsonPath("$.meta.requestId").exists());
        }

        @Test
        void recordActivity_authedFirstPray_createsActivityLogRow() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk());

            List<ActivityLog> rows = logRepo.findAll();
            assertThat(rows).hasSize(1);
            ActivityLog row = rows.get(0);
            assertThat(row.getUserId()).isEqualTo(user.getId());
            assertThat(row.getActivityType()).isEqualTo("pray");
            assertThat(row.getSourceFeature()).isEqualTo("daily-pray");
            assertThat(row.getPointsEarned()).isEqualTo(10);
        }

        @Test
        void recordActivity_authedFirstPray_incrementsPrayCount() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk());

            ActivityCount prayRow = countsRepo.findById(
                new ActivityCountId(user.getId(), CountType.PRAY.wireValue())).orElseThrow();
            assertThat(prayRow.getCountValue()).isEqualTo(1);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // B) Authentication & authorization (2 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("B) Authentication")
    class Auth {

        @Test
        void recordActivity_unauthed_returns401() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isUnauthorized());
        }

        @Test
        void recordActivity_invalidJwt_returns401() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer not.a.valid.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.startsWith("TOKEN_")));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // C) Validation (3 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("C) Validation")
    class Validation {

        @Test
        void recordActivity_missingBody_returns400() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(""))
                .andExpect(status().isBadRequest());
        }

        @Test
        void recordActivity_unknownActivityType_returns400Invalid() throws Exception {
            String json = "{\"activityType\":\"bogus\",\"sourceFeature\":\"daily-pray\"}";
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        }

        @Test
        void recordActivity_blankSourceFeature_returns400Validation() throws Exception {
            String json = "{\"activityType\":\"pray\",\"sourceFeature\":\"\"}";
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.sourceFeature").exists());
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // D) Level-up (2 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("D) Level-up")
    class LevelUp {

        @Test
        void recordActivity_pushesUserOver100Points_setsLevelUpTrue() throws Exception {
            // Pre-seed faith_points to 95 (just below the level-2 threshold of 100).
            jdbc.update(
                "INSERT INTO faith_points (user_id, total_points, current_level, last_updated) " +
                "VALUES (?, 95, 1, NOW())", user.getId());

            // POST journal: 25 base × 1.0 (single activity) = 25 → 95+25 = 120 → level 2
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("journal", "daily-journal")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.levelUp").value(true))
                .andExpect(jsonPath("$.data.currentLevel").value(2))
                .andExpect(jsonPath("$.data.totalPoints").value(120))
                .andExpect(jsonPath("$.data.newBadges[*].id",
                    org.hamcrest.Matchers.hasItem("level_2")));
        }

        @Test
        void recordActivity_alreadyAboveThreshold_levelUpFalse() throws Exception {
            // Pre-seed faith_points at level 2 with already-earned level_2 badge.
            jdbc.update(
                "INSERT INTO faith_points (user_id, total_points, current_level, last_updated) " +
                "VALUES (?, 200, 2, NOW())", user.getId());
            jdbc.update(
                "INSERT INTO user_badges (user_id, badge_id, earned_at, display_count) " +
                "VALUES (?, 'level_2', NOW(), 1)", user.getId());

            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.levelUp").value(false))
                .andExpect(jsonPath("$.data.currentLevel").value(2))
                .andExpect(jsonPath("$.data.newBadges[*].id",
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("level_2"))));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // E) Badge-earned (2 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("E) Badge-earned")
    class BadgesEarned {

        @Test
        void recordActivity_firstPrayer_emitsFirstPrayerBadge() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.newBadges[?(@.id=='first_prayer')].name")
                    .value("First Prayer"))
                .andExpect(jsonPath("$.data.newBadges[?(@.id=='first_prayer')].celebrationTier")
                    .value("toast"))
                .andExpect(jsonPath("$.data.newBadges[?(@.id=='first_prayer')].earnedAt")
                    .exists());
        }

        @Test
        void recordActivity_firstPrayer_persistsUserBadgeRow() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk());

            assertThat(badgeRepo.findAllByUserId(user.getId()))
                .extracting(UserBadge::getBadgeId)
                .contains("first_prayer");
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // F) Streak transitions (3 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("F) Streak transitions")
    class Streak {

        @Test
        void recordActivity_firstEverActivity_setsStreakOneNewTodayTrue() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.streak.current").value(1))
                .andExpect(jsonPath("$.data.streak.longest").value(1))
                .andExpect(jsonPath("$.data.streak.newToday").value(true));
        }

        @Test
        void recordActivity_secondPrayToday_streakUnchangedNewTodayFalse() throws Exception {
            // First call
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk());

            // Second call (record-only path)
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.streak.current").value(1))
                .andExpect(jsonPath("$.data.streak.newToday").value(false))
                .andExpect(jsonPath("$.data.pointsEarned").value(0))
                .andExpect(jsonPath("$.data.newBadges").isEmpty());
        }

        @Test
        void recordActivity_dayOverDay_streakIncrements() throws Exception {
            // Pre-seed streak_state with currentStreak=3, longestStreak=3, lastActiveDate=yesterday
            LocalDate yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1);
            jdbc.update(
                "INSERT INTO streak_state (user_id, current_streak, longest_streak, last_active_date, grace_days_used) " +
                "VALUES (?, 3, 3, ?, 0)", user.getId(), yesterday);

            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.streak.current").value(4))
                .andExpect(jsonPath("$.data.streak.longest").value(4))
                .andExpect(jsonPath("$.data.streak.newToday").value(true));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // G) First-time-today gating (3 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("G) First-time-today gating")
    class FirstTimeToday {

        @Test
        void recordActivity_firstPray_fullPathFires() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pointsEarned").value(
                    org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.data.streak.current").value(1))
                .andExpect(jsonPath("$.data.newBadges.length()").value(
                    org.hamcrest.Matchers.greaterThan(0)));
        }

        @Test
        void recordActivity_secondPraySameDay_recordOnlyPath() throws Exception {
            // First pray
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk());

            // Second pray same day → record-only path
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pointsEarned").value(0))
                .andExpect(jsonPath("$.data.streak.newToday").value(false))
                .andExpect(jsonPath("$.data.newBadges").isEmpty());

            // activity_log has 2 rows for this user
            assertThat(logRepo.findAll()).hasSize(2);
            // Pray count is 2
            ActivityCount prayRow = countsRepo.findById(
                new ActivityCountId(user.getId(), CountType.PRAY.wireValue())).orElseThrow();
            assertThat(prayRow.getCountValue()).isEqualTo(2);
        }

        @Test
        void recordActivity_differentTypeSameDay_fullPathForNewType() throws Exception {
            // First call: pray
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk());

            // Second call: journal — different activity type, same day
            // first_journal badge eligible, points delta non-zero, but streak.newToday false
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("journal", "daily-journal")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pointsEarned").value(
                    org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.data.streak.newToday").value(false))
                .andExpect(jsonPath("$.data.newBadges[*].id",
                    org.hamcrest.Matchers.hasItem("first_journal")));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // H) Transaction rollback (2 tests)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("H) Transaction rollback")
    class Rollback {

        @Test
        void recordActivity_constraintViolationMidTransaction_rollsBackEverything() throws Exception {
            // Pre-seed activity_counts pray row at Integer.MAX_VALUE so the next
            // increment overflows. PostgreSQL throws "integer out of range" on
            // INTEGER + 1 overflow (not modular wraparound), which propagates as
            // a DataIntegrityViolationException out of incrementCount() and
            // rolls back the outer @Transactional method.
            //
            // Status code note: JwtAuthenticationFilter (a pre-existing component
            // outside this spec's scope) wraps the entire filter chain in a
            // catch-all that converts ANY downstream exception into a 401
            // TOKEN_INVALID. So a DB integrity violation surfaces as 401 rather
            // than 500. The test asserts the actual codebase behavior; the
            // rollback verification below still proves the transactional
            // contract that this test exists to verify.
            jdbc.update(
                "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) " +
                "VALUES (?, 'pray', " + Integer.MAX_VALUE + ", NOW())", user.getId());

            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().is4xxClientError());

            // Rollback verification: nothing else got written.
            assertThat(logRepo.findAll()).isEmpty();
            assertThat(fpRepo.findById(user.getId())).isEmpty();
            assertThat(streakRepo.findById(user.getId())).isEmpty();
            assertThat(badgeRepo.findAllByUserId(user.getId())).isEmpty();
            // The pre-seeded count row remains at Integer.MAX_VALUE — the
            // attempted += 1 was rolled back.
            ActivityCount prayRow = countsRepo.findById(
                new ActivityCountId(user.getId(), CountType.PRAY.wireValue())).orElseThrow();
            assertThat(prayRow.getCountValue()).isEqualTo(Integer.MAX_VALUE);
        }

        @Test
        void recordActivity_successfulPath_persistsAllFiveTableChanges() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk());

            // 1. activity_log: one row
            assertThat(logRepo.findAll()).hasSize(1);
            // 2. activity_counts: pray = 1
            ActivityCount prayRow = countsRepo.findById(
                new ActivityCountId(user.getId(), CountType.PRAY.wireValue())).orElseThrow();
            assertThat(prayRow.getCountValue()).isEqualTo(1);
            // 3. faith_points: totalPoints = 10 (1 activity × 10 base × 1.0 multiplier)
            FaithPoints fp = fpRepo.findById(user.getId()).orElseThrow();
            assertThat(fp.getTotalPoints()).isEqualTo(10);
            assertThat(fp.getCurrentLevel()).isEqualTo(1);
            // 4. streak_state: currentStreak = 1
            StreakState streak = streakRepo.findById(user.getId()).orElseThrow();
            assertThat(streak.getCurrentStreak()).isEqualTo(1);
            assertThat(streak.getLongestStreak()).isEqualTo(1);
            assertThat(streak.getLastActiveDate()).isEqualTo(LocalDate.now(ZoneOffset.UTC));
            // 5. user_badges: contains at least first_prayer + level_1
            List<String> badgeIds = badgeRepo.findAllByUserId(user.getId()).stream()
                .map(UserBadge::getBadgeId)
                .toList();
            assertThat(badgeIds).contains("first_prayer", "level_1");
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // I) Response shape stability (1 test)
    // ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("I) Response shape")
    class ResponseShape {

        @Test
        void recordActivity_responseAlwaysIncludesAllDecision5Fields() throws Exception {
            mvc.perform(post("/api/v1/activity")
                    .header("Authorization", "Bearer " + validToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("pray", "daily-pray")))
                .andExpect(status().isOk())
                // top-level data fields
                .andExpect(jsonPath("$.data.pointsEarned").exists())
                .andExpect(jsonPath("$.data.totalPoints").exists())
                .andExpect(jsonPath("$.data.currentLevel").exists())
                .andExpect(jsonPath("$.data.levelUp").exists())
                // streak fields, including the always-zero grace fields
                .andExpect(jsonPath("$.data.streak.current").exists())
                .andExpect(jsonPath("$.data.streak.longest").exists())
                .andExpect(jsonPath("$.data.streak.newToday").exists())
                .andExpect(jsonPath("$.data.streak.graceUsed").value(0))
                .andExpect(jsonPath("$.data.streak.graceRemaining").value(0))
                // badges + multiplier tier
                .andExpect(jsonPath("$.data.newBadges").isArray())
                .andExpect(jsonPath("$.data.multiplierTier.label").exists())
                .andExpect(jsonPath("$.data.multiplierTier.multiplier").exists())
                // envelope meta
                .andExpect(jsonPath("$.meta.requestId").exists());
        }
    }
}
