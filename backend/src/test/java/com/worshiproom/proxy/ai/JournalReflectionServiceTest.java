package com.worshiproom.proxy.ai;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.SafetyBlockException;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.Candidate;
import com.google.genai.types.FinishReason;
import com.google.genai.types.GenerateContentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("JournalReflectionService")
class JournalReflectionServiceTest {

    private ProxyConfig config;
    private JournalReflectionService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        config = new ProxyConfig();
        config.getGemini().setApiKey("fake-test-key");
        objectMapper = new ObjectMapper();
        service = spy(new JournalReflectionService(config, objectMapper));
        // @PostConstruct initClient() doesn't fire with manual new — inject a
        // non-null Client so the null-guard in reflect() passes. The mock Client is
        // never actually invoked because callGeminiForReflection / callModels are stubbed
        // via doReturn() in each test.
        Client dummyClient = mock(Client.class);
        Field clientField = JournalReflectionService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, dummyClient);
    }

    // ---------- Helpers ----------

    private GenerateContentResponse mockResponseWithText(String text) {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        when(resp.text()).thenReturn(text);
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        return resp;
    }

    private String validResponseJson() {
        return """
            {
              "id": "reflect-gen-a8f3",
              "text": "There is so much honesty in what you wrote about the weight you're carrying today. You named the fear by name, and that takes courage. Showing up to write these words is already a kind of prayer. Let yourself be seen here."
            }
            """;
    }

    // ---------- Crisis path (2 tests) ----------

    @Test
    @DisplayName("Crisis keyword short-circuits, never calls Gemini")
    void reflect_crisisKeywordShortCircuits() {
        JournalReflectionRequest request = new JournalReflectionRequest("I want to die");

        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result.id()).isEqualTo("crisis");
        verify(service, never()).callGeminiForReflection(any(), anyBoolean());
    }

    @Test
    @DisplayName("Crisis response contains 988 and 741741")
    void reflect_crisisResponseContains988And741741() {
        JournalReflectionRequest request = new JournalReflectionRequest("I'm thinking about suicide tonight");

        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result.text()).contains("988");
        assertThat(result.text()).contains("741741");
    }

    // ---------- Happy path (2 tests) ----------

    @Test
    @DisplayName("Happy path: valid Gemini response returns parsed DTO")
    void reflect_happyPath_returnsValidResponse() {
        GenerateContentResponse mockResp = mockResponseWithText(validResponseJson());
        doReturn(mockResp).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), eq(false));

        JournalReflectionRequest request = new JournalReflectionRequest("Today I felt the weight of everything.");
        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result.id()).isEqualTo("reflect-gen-a8f3");
        assertThat(result.text()).isNotBlank();
        assertThat(result.text().length()).isBetween(50, 800);
        verify(service, times(1)).callGeminiForReflection(any(), anyBoolean());
    }

    @Test
    @DisplayName("Handles large entry (5000 chars) successfully")
    void reflect_handlesLargeEntry() {
        GenerateContentResponse mockResp = mockResponseWithText(validResponseJson());
        doReturn(mockResp).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), anyBoolean());

        String bigEntry = "a".repeat(5000);
        JournalReflectionRequest request = new JournalReflectionRequest(bigEntry);
        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result.id()).isEqualTo("reflect-gen-a8f3");
    }

    // ---------- Validation + retry (4 tests) ----------

    @Test
    @DisplayName("Text too short (<50 chars) triggers retry")
    void reflect_tooShortTextTriggersRetry() {
        String shortJson = """
            {
              "id": "reflect-x",
              "text": "Too short."
            }
            """;
        GenerateContentResponse tooShort = mockResponseWithText(shortJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(tooShort).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), eq(true));

        JournalReflectionRequest request = new JournalReflectionRequest("I felt a lot today.");
        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result.id()).isEqualTo("reflect-gen-a8f3");
        verify(service, times(2)).callGeminiForReflection(any(), anyBoolean());
        verify(service, times(1)).callGeminiForReflection(any(), eq(true));
    }

    @Test
    @DisplayName("Text too long (>800 chars) triggers retry")
    void reflect_tooLongTextTriggersRetry() {
        String longText = "a".repeat(900);
        String longJson = "{\"id\":\"reflect-x\",\"text\":\"" + longText + "\"}";
        GenerateContentResponse tooLong = mockResponseWithText(longJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(tooLong).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), eq(true));

        JournalReflectionRequest request = new JournalReflectionRequest("A meaningful entry.");
        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result.id()).isEqualTo("reflect-gen-a8f3");
        verify(service, times(2)).callGeminiForReflection(any(), anyBoolean());
    }

    @Test
    @DisplayName("Blank id triggers retry")
    void reflect_blankIdTriggersRetry() {
        String blankIdJson = """
            {
              "id": "",
              "text": "There is so much honesty in what you wrote about the weight you're carrying today. You named the fear by name, and that takes courage. Showing up to write these words is already a kind of prayer. Let yourself be seen here."
            }
            """;
        GenerateContentResponse blankId = mockResponseWithText(blankIdJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(blankId).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), eq(true));

        JournalReflectionRequest request = new JournalReflectionRequest("An entry.");
        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result.id()).isEqualTo("reflect-gen-a8f3");
        verify(service, times(2)).callGeminiForReflection(any(), anyBoolean());
    }

    @Test
    @DisplayName("Two validation failures fall back to FALLBACK_REFLECTION")
    void reflect_twoValidationFailuresFallBackToCanned() {
        String badJson = """
            {
              "id": "reflect-x",
              "text": "Short."
            }
            """;
        GenerateContentResponse bad = mockResponseWithText(badJson);
        doReturn(bad).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), anyBoolean());

        JournalReflectionRequest request = new JournalReflectionRequest("An entry.");
        JournalReflectionResponseDto result = service.reflect(request);

        assertThat(result).isSameAs(JournalReflectionService.FALLBACK_REFLECTION);
        assertThat(result.id()).isEqualTo("fallback");
        verify(service, times(2)).callGeminiForReflection(any(), anyBoolean());
    }

    // ---------- Error mapping (4 tests) ----------

    @Test
    @DisplayName("Null client throws UpstreamException with 'not configured' message")
    void reflect_nullClient_throwsUpstreamNotConfigured() throws Exception {
        Field clientField = JournalReflectionService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, null);

        JournalReflectionRequest request = new JournalReflectionRequest("An entry.");

        assertThatThrownBy(() -> service.reflect(request))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Safety-blocked response throws SafetyBlockException")
    void reflect_safetyBlockThrowsSafetyBlockException() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        Candidate candidate = mock(Candidate.class);
        when(candidate.finishReason()).thenReturn(Optional.of(new FinishReason(FinishReason.Known.SAFETY)));
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of(candidate)));
        when(resp.text()).thenReturn("any text");
        doReturn(resp).when(service).callGeminiForReflection(any(JournalReflectionRequest.class), anyBoolean());

        JournalReflectionRequest request = new JournalReflectionRequest("A difficult entry.");

        assertThatThrownBy(() -> service.reflect(request))
            .isInstanceOf(SafetyBlockException.class);
    }

    @Test
    @DisplayName("TimeoutException in cause chain maps to UpstreamTimeoutException")
    void reflect_webClientTimeoutMapsTo504() {
        doThrow(new RuntimeException("request timed out", new TimeoutException("30s")))
            .when(service).callGeminiForReflection(any(JournalReflectionRequest.class), anyBoolean());

        JournalReflectionRequest request = new JournalReflectionRequest("An entry.");

        assertThatThrownBy(() -> service.reflect(request))
            .isInstanceOf(UpstreamTimeoutException.class)
            .hasMessageContaining("timed out");
    }

    @Test
    @DisplayName("Generic SDK exception maps to UpstreamException with generic message")
    void reflect_sdkErrorMapsTo502() {
        doThrow(new RuntimeException("some internal sdk error"))
            .when(service).callGeminiForReflection(any(JournalReflectionRequest.class), anyBoolean());

        JournalReflectionRequest request = new JournalReflectionRequest("An entry.");

        assertThatThrownBy(() -> service.reflect(request))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("AI service is temporarily unavailable. Please try again.");
    }

    // ---------- No-leak invariant (1 test) ----------

    @Test
    @DisplayName("Upstream error text never leaks into thrown UpstreamException message")
    void noLeakOfUpstreamErrorText() {
        doThrow(new RuntimeException("GoogleSecretKeyABC key=AIzaSyEXAMPLE internal gemini detail"))
            .when(service).callGeminiForReflection(any(JournalReflectionRequest.class), anyBoolean());

        JournalReflectionRequest request = new JournalReflectionRequest("An entry.");

        try {
            service.reflect(request);
        } catch (UpstreamException ex) {
            String msg = ex.getMessage().toLowerCase(Locale.ROOT);
            assertThat(msg).doesNotContain("googlesecretkeyabc");
            assertThat(msg).doesNotContain("aiza");
            assertThat(msg).doesNotContain("gemini");
            assertThat(msg).doesNotContain("google");
            assertThat(msg).doesNotContain("key=");
            return;
        }
        throw new AssertionError("Expected UpstreamException to be thrown");
    }

    // ---------- Structural invariants (2 tests) ----------

    @Test
    @DisplayName("FALLBACK_REFLECTION matches length bounds (50-800) and has non-blank fields")
    void fallbackReflection_matchesLengthBounds() {
        JournalReflectionResponseDto fb = JournalReflectionService.FALLBACK_REFLECTION;

        assertThat(fb.id()).isEqualTo("fallback");
        assertThat(fb.text()).isNotBlank();
        assertThat(fb.text().length()).isBetween(50, 800);
        // Double-check via the validator
        assertThat(JournalReflectionService.validateResponse(fb)).isTrue();
    }

    @Test
    @DisplayName("validateResponse rejects off-bounds inputs")
    void validateResponse_rejectsOffBounds() {
        // (a) too short
        assertThat(JournalReflectionService.validateResponse(new JournalReflectionResponseDto(
            "x", "a".repeat(30)
        ))).isFalse();

        // (b) too long
        assertThat(JournalReflectionService.validateResponse(new JournalReflectionResponseDto(
            "x", "a".repeat(850)
        ))).isFalse();

        // (c) blank id
        assertThat(JournalReflectionService.validateResponse(new JournalReflectionResponseDto(
            "", "a".repeat(200)
        ))).isFalse();
        // (c) blank text
        assertThat(JournalReflectionService.validateResponse(new JournalReflectionResponseDto(
            "x", ""
        ))).isFalse();

        // (d) valid
        assertThat(JournalReflectionService.validateResponse(new JournalReflectionResponseDto(
            "x", "a".repeat(200)
        ))).isTrue();
    }
}
