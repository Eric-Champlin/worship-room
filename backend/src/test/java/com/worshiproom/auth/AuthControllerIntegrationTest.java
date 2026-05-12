package com.worshiproom.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.legal.LegalVersionService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.User;
import com.worshiproom.user.UserRepository;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class AuthControllerIntegrationTest extends AbstractIntegrationTest {

    private static final String TEST_JWT_SECRET =
        "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx";

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> TEST_JWT_SECRET);
        registry.add("auth.rate-limit.per-email.capacity", () -> "1000");
        registry.add("auth.rate-limit.per-ip.capacity", () -> "10000");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private static final String V = LegalVersionService.TERMS_VERSION;

    @BeforeEach
    void clean() { userRepository.deleteAll(); }

    @Test
    void registerNewEmailCreatesUserAndReturns200() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "email", "sarah@example.com",
            "password", "hunter2hunter2",
            "firstName", "Sarah",
            "lastName", "Johnson",
            "timezone", "America/Chicago",
            "termsVersion", V,
            "privacyVersion", V));

        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.registered").value(true))
            .andExpect(jsonPath("$.meta.requestId").exists());

        Optional<User> created = userRepository.findByEmailIgnoreCase("sarah@example.com");
        assertThat(created).isPresent();
        assertThat(created.get().getPasswordHash()).startsWith("$2a$10$");
        assertThat(created.get().getTimezone()).isEqualTo("America/Chicago");
    }

    @Test
    void registerExistingEmailReturnsSameShape_noSecondRow() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "email", "dup@example.com", "password", "hunter2hunter2",
            "firstName", "D", "lastName", "U",
            "termsVersion", V, "privacyVersion", V));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body));

        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.registered").value(true));

        assertThat(userRepository.existsByEmailIgnoreCase("dup@example.com")).isTrue();
        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void registerValidationFailureReturns400() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "email", "not-an-email",
            "password", "short",
            "firstName", "",
            "lastName", ""));

        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors.email").exists())
            .andExpect(jsonPath("$.fieldErrors.password").exists())
            .andExpect(jsonPath("$.fieldErrors.firstName").exists())
            .andExpect(jsonPath("$.fieldErrors.lastName").exists());
    }

    @Test
    void loginCorrectCredentialsReturnsToken() throws Exception {
        registerHelper("login@example.com", "hunter2hunter2", "Login", "User", "UTC");
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "login@example.com", "password", "hunter2hunter2"));

        MvcResult result = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token").exists())
            .andExpect(jsonPath("$.data.user.email").value("login@example.com"))
            .andExpect(jsonPath("$.data.user.displayName").value("Login"))
            .andExpect(jsonPath("$.data.user.isAdmin").value(false))
            .andExpect(jsonPath("$.meta.requestId").exists())
            .andReturn();

        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        String token = body.at("/data/token").asText();
        UUID userId = UUID.fromString(body.at("/data/user/id").asText());

        Jws<Claims> jws = jwtService.parseToken(token);
        assertThat(jws.getPayload().getSubject()).isEqualTo(userId.toString());
        assertThat(jws.getPayload().get("is_admin", Boolean.class)).isFalse();
    }

    @Test
    void loginWrongPasswordReturns401() throws Exception {
        registerHelper("wrongpw@example.com", "correctpassword", "X", "Y", "UTC");
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "wrongpw@example.com", "password", "wrongpassword"));

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
            .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void loginUnknownEmailReturnsSameShapeAsWrongPassword() throws Exception {
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "nonexistent@example.com", "password", "anything"));

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
            .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void loginCaseInsensitiveEmail() throws Exception {
        registerHelper("caseless@example.com", "hunter2hunter2", "C", "L", "UTC");
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "CASELESS@Example.COM", "password", "hunter2hunter2"));

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.user.email").value("caseless@example.com"));
    }

    // ----- Spec 1.5g — logout now requires authentication (was anonymous before) -----

    @Test
    void logoutWithoutTokenReturns401() throws Exception {
        // 1.5g — endpoint removed from PublicPaths so the filter can read
        // principal.jti for blocklisting. Anonymous calls now get 401.
        mvc.perform(post("/api/v1/auth/logout"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithInvalidTokenReturns401() throws Exception {
        mvc.perform(post("/api/v1/auth/logout").header("Authorization", "Bearer invalid.token"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithValidTokenReturns204AndRevokesJti() throws Exception {
        // Full flow: register + login → use returned JWT to call logout → 204
        // → same token now fails subsequent requests with 401 TOKEN_REVOKED.
        registerHelper("logout-revoke@example.com", "hunter2hunter2", "Lo", "Out", "UTC");
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "logout-revoke@example.com", "password", "hunter2hunter2"));
        MvcResult loginResult = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(status().isOk())
            .andReturn();
        String token = mapper.readTree(loginResult.getResponse().getContentAsString())
            .get("data").get("token").asText();

        // First logout: 204, jti is now blocklisted.
        mvc.perform(post("/api/v1/auth/logout")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());

        // Second request with the same token fails 401 TOKEN_REVOKED.
        mvc.perform(post("/api/v1/auth/logout")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("TOKEN_REVOKED"));
    }

    @Test
    void timezoneRoundTrips() throws Exception {
        registerHelper("tz@example.com", "hunter2hunter2", "T", "Z", "America/Los_Angeles");
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "tz@example.com", "password", "hunter2hunter2"));

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(jsonPath("$.data.user.timezone").value("America/Los_Angeles"));
    }

    @Test
    void registerInvalidTimezoneSilentlyDefaultsToUtc() throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "email", "badtz@example.com", "password", "hunter2hunter2",
            "firstName", "B", "lastName", "T", "timezone", "Not/AZone",
            "termsVersion", V, "privacyVersion", V));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());

        assertThat(userRepository.findByEmailIgnoreCase("badtz@example.com").orElseThrow().getTimezone())
            .isEqualTo("UTC");
    }

    @Test
    void tokenCanAuthenticateProtectedRoute() throws Exception {
        registerHelper("protected@example.com", "hunter2hunter2", "P", "R", "UTC");
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "protected@example.com", "password", "hunter2hunter2"));
        MvcResult result = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(loginBody)).andReturn();
        String token = mapper.readTree(result.getResponse().getContentAsString())
            .at("/data/token").asText();

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/v1/does-not-exist")
                .header("Authorization", "Bearer " + token))
            .andExpect(result2 -> {
                int status = result2.getResponse().getStatus();
                if (status == 401) throw new AssertionError("token should have authenticated");
            });
    }

    private void registerHelper(String email, String password, String fn, String ln, String tz)
            throws Exception {
        String body = mapper.writeValueAsString(Map.of(
            "email", email, "password", password,
            "firstName", fn, "lastName", ln, "timezone", tz,
            "termsVersion", V, "privacyVersion", V));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());
    }
}
