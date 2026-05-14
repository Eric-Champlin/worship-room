package com.worshiproom.verse;

import com.worshiproom.auth.AuthenticatedUser;
import com.worshiproom.config.ProxyConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Spec 6.8 — VerseFindsYouController slice test. Covers spec test items
 * T21, T22, T23, T25.
 *
 * <p>Excludes Spring Security auto-config like canonical sibling slice tests
 * ({@code QotdControllerTest}). The 401 unauthenticated case is enforced by
 * {@code SecurityConfig} (production wiring) and is not the slice-test layer's
 * concern; integration tests cover that surface.
 */
@WebMvcTest(value = VerseFindsYouController.class,
    excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import({VerseExceptionHandler.class, ProxyConfig.class, VerseFindsYouRateLimitConfig.class,
    VerseFindsYouControllerTest.AuthPrincipalConfig.class})
class VerseFindsYouControllerTest {

    /**
     * Without SecurityAutoConfiguration the @AuthenticationPrincipal resolver
     * isn't registered. Register it manually via a WebMvcConfigurer so the
     * controller's principal arg is populated from SecurityContextHolder.
     */
    @TestConfiguration
    static class AuthPrincipalConfig implements WebMvcConfigurer {
        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
            resolvers.add(new AuthenticationPrincipalArgumentResolver());
        }
    }

    @Autowired private MockMvc mvc;
    @MockBean private VerseFindsYouService service;
    @MockBean private VerseFindsYouRateLimitService rateLimit;

    private static final UUID USER_A = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @BeforeEach
    void setupAuthContext() {
        // spring-security-test isn't on the classpath; set the authentication
        // directly via SecurityContextHolder. @AuthenticationPrincipal reads
        // from this context, so the controller's principal arg gets populated.
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(USER_A, false),
                "n/a",
                Collections.emptyList()));
    }

    @AfterEach
    void clearAuthContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void unknownTrigger_returns400_invalidInput() throws Exception {
        doNothing().when(rateLimit).checkAndConsume(any());

        mvc.perform(get("/api/v1/verse-finds-you")
                .param("trigger", "not-a-real-trigger")
                )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void missingTrigger_returns400() throws Exception {
        doNothing().when(rateLimit).checkAndConsume(any());

        mvc.perform(get("/api/v1/verse-finds-you")
                )
            .andExpect(status().isBadRequest());
    }

    @Test
    void disabled_returns200WithReasonDisabled() throws Exception {
        // T25 — enabled=false → reason=disabled.
        doNothing().when(rateLimit).checkAndConsume(any());
        when(service.surface(eq(USER_A), eq(TriggerType.POST_COMPOSE), any(), eq(false)))
            .thenReturn(SurfacingResult.disabled());

        mvc.perform(get("/api/v1/verse-finds-you")
                .param("trigger", "post_compose")
                .param("context", "grief")
                .param("enabled", "false")
                )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verse").doesNotExist())  // null fields stripped by spring.jackson.default-property-inclusion=non_null
            .andExpect(jsonPath("$.reason").value("disabled"));
    }

    @Test
    void surfacedVerse_returns200WithFullShape() throws Exception {
        // T23 — verse present, reason null, response shape correct.
        doNothing().when(rateLimit).checkAndConsume(any());
        CuratedVerse v = new CuratedVerse("synthetic-1", "Test 1:1", "Test text.", "WEB",
            Set.of("comfort"), Set.of(), 2);
        when(service.surface(eq(USER_A), eq(TriggerType.POST_COMPOSE), eq("grief"), eq(true)))
            .thenReturn(SurfacingResult.success(v));

        mvc.perform(get("/api/v1/verse-finds-you")
                .param("trigger", "post_compose")
                .param("context", "grief")
                .param("enabled", "true")
                )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verse.reference").value("Test 1:1"))
            .andExpect(jsonPath("$.verse.text").value("Test text."));
    }

    @Test
    void cooldown_returns200WithReasonCooldownAndCooldownUntil() throws Exception {
        // T21 — non-surfacing case carries reason but NO error / no internal detail.
        doNothing().when(rateLimit).checkAndConsume(any());
        OffsetDateTime until = OffsetDateTime.now(ZoneOffset.UTC).plusHours(23);
        when(service.surface(eq(USER_A), eq(TriggerType.POST_COMPOSE), any(), eq(true)))
            .thenReturn(SurfacingResult.cooldown(until));

        mvc.perform(get("/api/v1/verse-finds-you")
                .param("trigger", "post_compose")
                .param("context", "grief")
                .param("enabled", "true")
                )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reason").value("cooldown"))
            .andExpect(jsonPath("$.cooldownUntil").exists());
    }

    @Test
    void rateLimitExceeded_returns429WithRetryAfter() throws Exception {
        // T24 — 11th request (after consuming 10 in an hour) returns 429.
        org.mockito.Mockito.doThrow(new VerseFindsYouRateLimitException(3600))
            .when(rateLimit).checkAndConsume(USER_A);

        mvc.perform(get("/api/v1/verse-finds-you")
                .param("trigger", "post_compose")
                )
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                .header().string("Retry-After", "3600"));
    }

    @Test
    void crisisSuppression_returns200WithReason() throws Exception {
        // T9 — crisis-flagged user gets reason but NO verse leak.
        doNothing().when(rateLimit).checkAndConsume(any());
        when(service.surface(eq(USER_A), any(), any(), anyBoolean()))
            .thenReturn(SurfacingResult.crisis());

        mvc.perform(get("/api/v1/verse-finds-you")
                .param("trigger", "post_compose")
                .param("enabled", "true")
                )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reason").value("crisis_suppression"))
            .andExpect(jsonPath("$.verse").doesNotExist());
    }
}
