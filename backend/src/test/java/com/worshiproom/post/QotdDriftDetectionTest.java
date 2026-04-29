package com.worshiproom.post;

import java.io.File;
import java.io.IOException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Spec 3.9 drift detection — asserts that {@link QotdService#findForDate(LocalDate)}
 * agrees with the frontend {@code getTodaysQuestion(date)} modulo-72 rotation for every
 * scenario in {@code _test_fixtures/qotd-rotation.json}. The frontend half of this pair
 * lives at {@code frontend/src/constants/__tests__/qotd-drift.test.ts}.
 *
 * <p>Both sides consume the same fixture. Each scenario records {@code dayOfYear} and
 * {@code expectedQotdId} (computed as {@code "qotd-" + ((dayOfYear % 72) + 1)}). The
 * backend harness:
 * <ol>
 *   <li>Captures the integer slot the service queries via {@code ArgumentCaptor}.</li>
 *   <li>Stubs the repository to return a question whose id matches the expected qotd id.</li>
 *   <li>Asserts the captured slot equals the fixture's expected slot AND the returned
 *       question id matches the fixture's expected id.</li>
 * </ol>
 *
 * <p>Liturgical-season-aware rotation is deferred to Phase 9.2 (spec D1). Backend has
 * no seasonal branch yet, so every fixture date exercises the modulo path. The frontend
 * mocks {@code getLiturgicalSeason} to force the same path. This is the deliberate
 * behavioural-equivalence contract for the modulo-72 fallback.
 */
class QotdDriftDetectionTest {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .build();

    private static final int POOL_SIZE = 72;

    @ParameterizedTest(name = "{0}")
    @MethodSource("scenarios")
    void backendModuloMatchesFrontendFixture(QotdRotationScenario scenario) {
        QotdQuestionRepository repo = mock(QotdQuestionRepository.class);
        QotdProperties props = new QotdProperties();
        Clock clock = Clock.fixed(
                scenario.date().atStartOfDay(ZoneOffset.UTC).toInstant(),
                ZoneOffset.UTC);

        int expectedSlot = scenario.dayOfYear() % POOL_SIZE;
        QotdQuestion stub = TestQotdFactory.build(
                scenario.expectedQotdId(), "fixture", "encouraging", null);
        when(repo.findByDisplayOrderAndIsActiveTrue(expectedSlot)).thenReturn(Optional.of(stub));

        QotdService service = new QotdService(repo, props, clock);

        QotdQuestion result = service.findForDate(scenario.date());

        ArgumentCaptor<Integer> slotCaptor = ArgumentCaptor.forClass(Integer.class);
        verify(repo).findByDisplayOrderAndIsActiveTrue(slotCaptor.capture());

        assertThat(slotCaptor.getValue())
                .as("Slot drift in scenario '%s' (date=%s): backend computed %d, fixture expects %d",
                        scenario.id(), scenario.date(), slotCaptor.getValue(), expectedSlot)
                .isEqualTo(expectedSlot);
        assertThat(result.getId())
                .as("Id drift in scenario '%s' (date=%s)", scenario.id(), scenario.date())
                .isEqualTo(scenario.expectedQotdId());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("scenarios")
    void fixtureDayOfYearMatchesJavaLocalDate(QotdRotationScenario scenario) {
        // Cheap independent guard: the fixture's recorded dayOfYear must match
        // java.time.LocalDate.getDayOfYear() so the JSON file can't drift away
        // from JVM date math. Frontend half asserts the same against
        // (Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 86400000.
        assertThat(scenario.date().getDayOfYear())
                .as("Fixture dayOfYear mismatch for scenario '%s' (date=%s)",
                        scenario.id(), scenario.date())
                .isEqualTo(scenario.dayOfYear());
    }

    static Stream<QotdRotationScenario> scenarios() throws IOException {
        File fixtureFile = new File("../_test_fixtures/qotd-rotation.json");
        JsonNode root = MAPPER.readTree(fixtureFile);
        JsonNode scenariosNode = root.get("scenarios");
        return StreamSupport.stream(scenariosNode.spliterator(), false)
                .map(node -> new QotdRotationScenario(
                        node.get("id").asText(),
                        LocalDate.parse(node.get("date").asText()),
                        node.get("dayOfYear").asInt(),
                        node.get("expectedQotdId").asText()));
    }

    record QotdRotationScenario(
            String id,
            LocalDate date,
            int dayOfYear,
            String expectedQotdId) {

        @Override
        public String toString() {
            return id + " (" + date + ")";
        }
    }
}
