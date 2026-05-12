package com.worshiproom.auth.blocklist;

import com.worshiproom.auth.session.ActiveSession;
import com.worshiproom.auth.session.ActiveSessionRepository;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for {@link JwtBlocklistCleanupJob} — exercises the actual
 * Postgres-backed delete queries. Redis is not wired (degraded mode is fine
 * for this job; it only writes to / reads from Postgres).
 */
class JwtBlocklistCleanupJobTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx");
    }

    @Autowired private JwtBlocklistRepository blocklistRepository;
    @Autowired private JwtBlocklistCleanupJob job;
    @Autowired private ActiveSessionRepository sessionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private User user;

    @BeforeEach
    void setUp() {
        blocklistRepository.deleteAll();
        sessionRepository.deleteAll();
        userRepository.deleteAll();
        user = userRepository.save(new User(
            "cleanup@example.com", encoder.encode("password1234"), "First", "Last", "UTC"));
    }

    @Test
    void cleanup_deletesExpiredEntries() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID jti = UUID.randomUUID();
        blocklistRepository.save(new JwtBlocklistEntry(
            jti, user.getId(),
            now.minusHours(2),
            now.minusMinutes(30) // already expired
        ));

        job.cleanup();

        assertThat(blocklistRepository.existsById(jti)).isFalse();
    }

    @Test
    void cleanup_preservesActiveEntries() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID jti = UUID.randomUUID();
        blocklistRepository.save(new JwtBlocklistEntry(
            jti, user.getId(),
            now.minusMinutes(10),
            now.plusMinutes(50) // 50 minutes left — still active
        ));

        job.cleanup();

        assertThat(blocklistRepository.existsById(jti)).isTrue();
    }

    @Test
    void cleanup_removesOrphanActiveSessions() {
        // An active_sessions row whose jti is also in jwt_blocklist (active) is
        // an orphan — the token is revoked but the session deletion failed.
        // Cleanup should sweep these.
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID jti = UUID.randomUUID();
        blocklistRepository.save(new JwtBlocklistEntry(
            jti, user.getId(), now, now.plusMinutes(50)));
        ActiveSession session = new ActiveSession(user.getId(), jti, "Test Device", "TestCity");
        sessionRepository.save(session);

        job.cleanup();

        assertThat(sessionRepository.findByJti(jti)).isEmpty();
    }
}
