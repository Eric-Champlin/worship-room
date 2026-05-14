package com.worshiproom.verse;

import com.worshiproom.safety.CrisisFlagGate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Spec 6.8 — VerseFindsYouService unit tests covering the orchestration
 * (gate, cooldown, disabled, no_match) and the silent-failure paths.
 *
 * <p>Mocks every dependency so the service's reason-code routing can be
 * asserted in isolation. Redis fail-CLOSED is exercised here (T16) by
 * making RedisTemplate throw DataAccessException — the shared singleton
 * Redis container in TestContainers cannot be stopped without breaking
 * sibling integration tests in the same JVM.
 */
@ExtendWith(MockitoExtension.class)
class VerseFindsYouServiceTest {

    @Mock private CrisisFlagGate crisisFlagGate;
    @SuppressWarnings("rawtypes")
    @Mock private RedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOps;
    @Mock private VerseSelectionEngine engine;
    @Mock private VerseSurfacingLogRepository logRepository;

    private VerseFindsYouService service;

    private static final UUID USER_A = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private CuratedVerse synthetic;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setup() {
        service = new VerseFindsYouService(crisisFlagGate, redisTemplate, engine, logRepository);
        synthetic = new CuratedVerse("synthetic-1", "Test 1:1", "Test text.", "WEB",
            Set.of("comfort"), Set.of(), 2);
    }

    @Test
    @DisplayName("Disabled flag → reason=DISABLED, no other gate runs")
    void disabledShortCircuits() {
        SurfacingResult result = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", false);

        assertThat(result.reason()).isEqualTo(SurfacingReason.DISABLED);
        assertThat(result.verse()).isEmpty();
        verify(crisisFlagGate, never()).isUserCrisisFlagged(any());
        verify(engine, never()).select(any(), any());
    }

    @Test
    @DisplayName("Crisis-flagged user → reason=CRISIS_SUPPRESSION, engine never called")
    void crisisShortCircuits() {
        when(crisisFlagGate.isUserCrisisFlagged(USER_A)).thenReturn(true);

        SurfacingResult result = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", true);

        assertThat(result.reason()).isEqualTo(SurfacingReason.CRISIS_SUPPRESSION);
        assertThat(result.verse()).isEmpty();
        verify(engine, never()).select(any(), any());
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("T16: Redis throws DataAccessException → fail CLOSED (cooldown reason returned)")
    void redisDownFailsClosed() {
        when(crisisFlagGate.isUserCrisisFlagged(USER_A)).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(any())).thenThrow(new DataAccessResourceFailureException("Redis unreachable"));

        SurfacingResult result = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", true);

        assertThat(result.reason()).isEqualTo(SurfacingReason.COOLDOWN);
        assertThat(result.verse()).isEmpty();
        // Selection MUST NOT have run when Redis is unreachable.
        verify(engine, never()).select(any(), any());
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("T17: VerseCatalog returns empty → reason=NO_MATCH (Gate-G-SILENT-FAILURE)")
    void noMatchReturnsReason() {
        when(crisisFlagGate.isUserCrisisFlagged(USER_A)).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(any())).thenReturn(null);
        when(engine.select(USER_A, "grief")).thenReturn(Optional.empty());

        SurfacingResult result = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", true);

        assertThat(result.reason()).isEqualTo(SurfacingReason.NO_MATCH);
        assertThat(result.verse()).isEmpty();
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("Happy path: verse selected, log saved, cooldown key set")
    void happyPathSurfacesVerse() {
        when(crisisFlagGate.isUserCrisisFlagged(USER_A)).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(any())).thenReturn(null);
        when(engine.select(USER_A, "grief")).thenReturn(Optional.of(synthetic));

        SurfacingResult result = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", true);

        assertThat(result.reason()).isNull();
        assertThat(result.verse()).contains(synthetic);
        verify(valueOps).set(any(), any(), any(java.time.Duration.class));
        verify(logRepository).save(any(VerseSurfacingLog.class));
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("T20: every silent-failure path returns verse=empty (no fallback verse)")
    void noFallbackVerseOnAnyFailure() {
        // Disabled
        SurfacingResult disabled = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", false);
        assertThat(disabled.verse()).isEmpty();

        // Crisis
        when(crisisFlagGate.isUserCrisisFlagged(USER_A)).thenReturn(true);
        SurfacingResult crisis = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", true);
        assertThat(crisis.verse()).isEmpty();

        // Redis down
        when(crisisFlagGate.isUserCrisisFlagged(USER_A)).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get(any())).thenThrow(new DataAccessResourceFailureException("down"));
        SurfacingResult redisDown = service.surface(USER_A, TriggerType.POST_COMPOSE, "grief", true);
        assertThat(redisDown.verse()).isEmpty();
    }
}
