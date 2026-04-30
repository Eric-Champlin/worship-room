package com.worshiproom.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worshiproom.legal.LegalVersionService;
import com.worshiproom.support.AbstractIntegrationTest;
import com.worshiproom.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Migration note (Spec 1.7): class-level {@code @SpringBootTest(properties=...)} is kept
 * inline because the rate-limit overrides are static configuration, not container-dependent
 * values. Datasource properties are inherited from {@link AbstractIntegrationTest}. Dynamic/
 * conditional values ({@code jwt.secret}, {@code proxy.trust-forwarded-headers}) stay in a
 * subclass {@link DynamicPropertySource} method. Spring merges the inline properties with the
 * inherited {@code @SpringBootTest} when the annotation is redeclared on the subclass.
 */
@SpringBootTest(properties = {
    "auth.rate-limit.per-email.capacity=5",
    "auth.rate-limit.per-email.window-minutes=15",
    "auth.rate-limit.per-ip.capacity=20",
    "auth.rate-limit.per-ip.window-minutes=15"
})
@AutoConfigureMockMvc
class LoginRateLimitFilterTest extends AbstractIntegrationTest {

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> "test-jwt-secret-at-least-32-bytes-long-xxxxxxxxxxxxxx");
        // Trust XFF so each test can isolate its per-IP bucket (all MockMvc
        // requests otherwise share one IP and cross-contaminate buckets).
        registry.add("proxy.trust-forwarded-headers", () -> "true");
    }

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void clean() { userRepository.deleteAll(); }

    // Each test uses a distinct X-Forwarded-For so its per-IP bucket is
    // independent. Without this, all MockMvc requests share remoteAddr
    // and the 20-token per-IP bucket cross-contaminates tests within the
    // same Spring context.
    private static final String IP_TEST_1 = "10.0.0.1";
    private static final String IP_TEST_2 = "10.0.0.2";
    private static final String IP_TEST_3 = "10.0.0.3";
    private static final String IP_TEST_4 = "10.0.0.4";
    private static final String IP_TEST_5 = "10.0.0.5";
    private static final String IP_TEST_6 = "10.0.0.6";
    private static final String IP_TEST_7 = "10.0.0.7";
    private static final String IP_TEST_8 = "10.0.0.8";
    private static final String IP_TEST_9 = "10.0.0.9";

    @Test
    void within5AttemptsPerEmail_noRateLimit() throws Exception {
        String body = mapper.writeValueAsString(Map.of("email", "bucket-a@example.com", "password", "whatever12345"));
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login")
                    .header("X-Forwarded-For", IP_TEST_1)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void sixthAttemptPerEmail_returns429WithRetryAfter() throws Exception {
        String body = mapper.writeValueAsString(Map.of("email", "bucket-b@example.com", "password", "whatever12345"));
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_2)
                .contentType(MediaType.APPLICATION_JSON).content(body));
        }
        mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_2)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"))
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void differentEmails_differentBuckets() throws Exception {
        String a = mapper.writeValueAsString(Map.of("email", "bucket-c@example.com", "password", "whatever12345"));
        String b = mapper.writeValueAsString(Map.of("email", "bucket-d@example.com", "password", "whatever12345"));
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login")
                    .header("X-Forwarded-For", IP_TEST_3)
                    .contentType(MediaType.APPLICATION_JSON).content(a))
                .andExpect(status().isUnauthorized());
            mvc.perform(post("/api/v1/auth/login")
                    .header("X-Forwarded-For", IP_TEST_3)
                    .contentType(MediaType.APPLICATION_JSON).content(b))
                .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void within20AttemptsPerIp_noRateLimit() throws Exception {
        for (int i = 0; i < 20; i++) {
            String body = mapper.writeValueAsString(Map.of(
                "email", "ipbucket" + i + "@example.com",
                "password", "whatever12345"));
            mvc.perform(post("/api/v1/auth/login")
                    .header("X-Forwarded-For", IP_TEST_4)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void twentyFirstAttemptPerIp_returns429() throws Exception {
        for (int i = 0; i < 20; i++) {
            String body = mapper.writeValueAsString(Map.of(
                "email", "ipburst" + i + "@example.com",
                "password", "whatever12345"));
            mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_5)
                .contentType(MediaType.APPLICATION_JSON).content(body));
        }
        String body = mapper.writeValueAsString(Map.of(
            "email", "ipburst-final@example.com",
            "password", "whatever12345"));
        mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_5)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"));
    }

    @Test
    void rateLimitHeadersPresent() throws Exception {
        String body = mapper.writeValueAsString(Map.of("email", "headers@example.com", "password", "whatever12345"));
        mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_6)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(header().exists("X-RateLimit-Limit"))
            .andExpect(header().exists("X-RateLimit-Remaining"))
            .andExpect(header().exists("X-RateLimit-Reset"));
    }

    @Test
    void filterSkipsRegister() throws Exception {
        for (int i = 0; i < 25; i++) {
            String body = mapper.writeValueAsString(Map.of(
                "email", "reg" + i + "@example.com",
                "password", "verylongpassword123",
                "firstName", "R",
                "lastName", "R",
                "termsVersion", LegalVersionService.TERMS_VERSION,
                "privacyVersion", LegalVersionService.PRIVACY_VERSION));
            mvc.perform(post("/api/v1/auth/register")
                    .header("X-Forwarded-For", IP_TEST_7)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        }
        String loginBody = mapper.writeValueAsString(Map.of(
            "email", "reg0@example.com", "password", "wrongpassword"));
        mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_7)
                .contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void filterSkipsGetOnLoginPath() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .get("/api/v1/auth/login")
            .header("X-Forwarded-For", IP_TEST_8))
            .andExpect(result -> {
                int status = result.getResponse().getStatus();
                if (status == 429) throw new AssertionError("GET should not be rate-limited");
            });
    }

    @Test
    void malformedJsonBody_perIpStillEnforced() throws Exception {
        for (int i = 0; i < 20; i++) {
            mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_9)
                .contentType(MediaType.APPLICATION_JSON)
                .content("not-json-garbage"));
        }
        mvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", IP_TEST_9)
                .contentType(MediaType.APPLICATION_JSON)
                .content("still-garbage"))
            .andExpect(status().isTooManyRequests());
    }
}
