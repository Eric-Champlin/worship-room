package com.worshiproom.auth.session;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.auth.JwtService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 1.5g — end-to-end tests for the {@code /api/v1/sessions/*} endpoints.
 *
 * <p>Each test logs Alice in via {@link AuthService} to get a real JWT carrying
 * {@code jti} + {@code gen} claims. Bob (different user) is created so the
 * cross-user 403 test has a foreign session row to attempt revoking.
 *
 * <p>The Redis Testcontainer is not wired in this class — {@link JwtBlocklistService}
 * exercises its degraded Postgres-fallback path on every read/write. Step 14
 * adds an integration test that opts into Redis to cover the fast path.
 */
@AutoConfigureMockMvc
class SessionsControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
        registry.add("auth.rate-limit.sessions.capacity", () -> "1000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private BCryptPasswordEncoder encoder;
    @Autowired private ActiveSessionService activeSessionService;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        alice = createUser("alice@example.com");
        bob = createUser("bob@example.com");
    }

    @Test
    void getSessions_returnsOnlyOwnSessions() throws Exception {
        // Two sessions for Alice, one for Bob. Alice's GET returns 2; Bob's returns 1.
        UUID aliceJti1 = UUID.randomUUID();
        UUID aliceJti2 = UUID.randomUUID();
        UUID bobJti = UUID.randomUUID();
        activeSessionService.recordSession(alice.getId(), aliceJti1, "Mozilla/5.0 (Macintosh) Chrome", "8.8.8.8");
        activeSessionService.recordSession(alice.getId(), aliceJti2, "Mozilla/5.0 (iPhone) Safari", null);
        activeSessionService.recordSession(bob.getId(), bobJti, "Mozilla/5.0", null);

        // Alice's token references aliceJti1 (the current device).
        String aliceToken = jwtService.generateToken(alice.getId(), false,
            alice.getSessionGeneration());
        // We can't easily inject jti into the JWT for this test without a custom
        // signing path, so the principal carries a DIFFERENT jti than the recorded
        // session rows. That's fine — we only assert COUNT and ownership, not isCurrent.

        MvcResult result = mvc.perform(get("/api/v1/sessions")
                .header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andReturn();

        JsonNode data = mapper.readTree(result.getResponse().getContentAsString()).get("data");
        assertThat(data.size()).isEqualTo(2);
        // Neither row should be Bob's — verified by counts above.
    }

    @Test
    void deleteSession_crossUser_returns403_notFound() throws Exception {
        // Alice attempts to revoke Bob's session_id. Per W7/W9 we MUST return
        // 403 (not 404) — leaking 404 vs 403 reveals whether the session_id
        // exists in the DB at all.
        UUID bobJti = UUID.randomUUID();
        ActiveSession bobSession = activeSessionService.recordSession(
            bob.getId(), bobJti, "Mozilla/5.0", null);

        String aliceToken = jwtService.generateToken(alice.getId(), false, alice.getSessionGeneration());

        mvc.perform(delete("/api/v1/sessions/" + bobSession.getSessionId())
                .header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void deleteSession_unknownSessionId_returns403_notFound() throws Exception {
        // Unknown ID also returns 403 (not 404) per the same anti-enumeration logic.
        String aliceToken = jwtService.generateToken(alice.getId(), false, alice.getSessionGeneration());

        mvc.perform(delete("/api/v1/sessions/" + UUID.randomUUID())
                .header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void getSessions_unauthenticated_returns401() throws Exception {
        mvc.perform(get("/api/v1/sessions"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteAll_returns204_andBumpsSessionGeneration() throws Exception {
        // Pre-condition: Alice has gen=0.
        int genBefore = alice.getSessionGeneration();
        UUID aliceJti = UUID.randomUUID();
        activeSessionService.recordSession(alice.getId(), aliceJti, "Mozilla/5.0", null);

        String aliceToken = jwtService.generateToken(alice.getId(), false, genBefore);

        mvc.perform(delete("/api/v1/sessions/all")
                .header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isNoContent());

        User reloaded = userRepository.findById(alice.getId()).orElseThrow();
        assertThat(reloaded.getSessionGeneration()).isEqualTo(genBefore + 1);

        // active_sessions rows should be wiped for Alice.
        List<SessionResponse> remaining = activeSessionService.listSessionsForUser(
            alice.getId(), null);
        assertThat(remaining).isEmpty();
    }

    @Test
    void deleteAll_currentTokenFailsOnNextRequest() throws Exception {
        // After /sessions/all, the current token's gen claim no longer matches the
        // row → next request → 401 TOKEN_REVOKED.
        String aliceToken = jwtService.generateToken(alice.getId(), false,
            alice.getSessionGeneration());

        mvc.perform(delete("/api/v1/sessions/all")
                .header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/sessions")
                .header("Authorization", "Bearer " + aliceToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("TOKEN_REVOKED"));
    }

    private User createUser(String email) {
        User u = new User(email, encoder.encode("password1234"), "First", "Last", "UTC");
        return userRepository.save(u);
    }
}
