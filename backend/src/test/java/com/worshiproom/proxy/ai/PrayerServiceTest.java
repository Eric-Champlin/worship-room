package com.worshiproom.proxy.ai;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.SafetyBlockException;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.BlockedReason;
import com.google.genai.types.Candidate;
import com.google.genai.types.FinishReason;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.GenerateContentResponsePromptFeedback;
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

@DisplayName("PrayerService")
class PrayerServiceTest {

    private ProxyConfig config;
    private PrayerService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        config = new ProxyConfig();
        config.getGemini().setApiKey("fake-test-key");
        objectMapper = new ObjectMapper();
        service = spy(new PrayerService(config, objectMapper));
        // @PostConstruct initClient() doesn't fire with manual new — inject a
        // non-null Client so the null-guard in pray() passes. The mock Client is
        // never actually invoked because callGeminiForPrayer / callModels are stubbed
        // via doReturn() in each test.
        Client dummyClient = mock(Client.class);
        Field clientField = PrayerService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, dummyClient);
    }

    // ---------- Helpers ----------

    /** Build a mock GenerateContentResponse whose .text() returns the given JSON. */
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
              "id": "prayer-anxiety-gen-a8f3",
              "topic": "anxiety",
              "text": "Dear God, I come to You with the weight of tomorrow pressing on me. I'm anxious about what I cannot control, and I need Your peace. You know my every fear, every worry. Help me to release them into Your hands and trust that You walk beside me. Give me courage for tomorrow and rest for tonight. Fill me with the confidence that comes only from knowing You hold my future. I lean on You completely. Amen."
            }
            """;
    }

    // ---------- Crisis path (2 tests) ----------

    @Test
    @DisplayName("Crisis keyword short-circuits, never calls Gemini")
    void pray_crisisKeywordShortCircuits() {
        PrayerRequest request = new PrayerRequest("I want to die");

        PrayerResponseDto result = service.pray(request);

        assertThat(result.id()).isEqualTo("crisis");
        assertThat(result.topic()).isEqualTo("crisis");
        verify(service, never()).callGeminiForPrayer(any(), anyBoolean());
    }

    @Test
    @DisplayName("Crisis response matches structural invariant (Dear God + Amen + 988)")
    void pray_crisisResponseMatchesStructuralInvariant() {
        PrayerRequest request = new PrayerRequest("I'm thinking about suicide");

        PrayerResponseDto result = service.pray(request);

        assertThat(result.text()).startsWith("Dear God");
        assertThat(result.text()).endsWith("Amen.");
        assertThat(result.text()).contains("988");
    }

    // ---------- Happy path (3 tests) ----------

    @Test
    @DisplayName("Happy path: valid Gemini response returns parsed DTO")
    void pray_happyPath_returnsValidResponse() {
        GenerateContentResponse mockResp = mockResponseWithText(validResponseJson());
        doReturn(mockResp).when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("I'm anxious about tomorrow");
        PrayerResponseDto result = service.pray(request);

        assertThat(result.id()).isEqualTo("prayer-anxiety-gen-a8f3");
        assertThat(result.topic()).isEqualTo("anxiety");
        assertThat(result.text()).startsWith("Dear God");
        assertThat(result.text()).endsWith("Amen.");
        verify(service, times(1)).callGeminiForPrayer(any(), anyBoolean());
    }

    @Test
    @DisplayName("Topic is preserved from Gemini output when in allowed set")
    void pray_topicClassifiedIntoAllowedValue() {
        GenerateContentResponse mockResp = mockResponseWithText(validResponseJson());
        doReturn(mockResp).when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("anxious");
        PrayerResponseDto result = service.pray(request);

        assertThat(result.topic()).isEqualTo("anxiety");
    }

    @Test
    @DisplayName("Unclassifiable request accepted as \"general\" topic")
    void pray_unclassifiableRequestFallsBackToGeneral() {
        String generalJson = """
            {
              "id": "prayer-general",
              "topic": "general",
              "text": "Dear God, I come to You not knowing exactly what to ask, but trusting that You know me better than I know myself. Meet me right where I am in this moment. Fill me with Your peace. Help me to slow down and listen for Your voice. Remind me that I am never alone, that You are always near, and that Your plans for me are good. I surrender this moment to You. Amen."
            }
            """;
        GenerateContentResponse mockResp = mockResponseWithText(generalJson);
        doReturn(mockResp).when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("help me pray");
        PrayerResponseDto result = service.pray(request);

        assertThat(result.topic()).isEqualTo("general");
    }

    // ---------- Validation + retry (5 tests) ----------

    @Test
    @DisplayName("Text missing salutation triggers retry")
    void pray_textMissingSalutationTriggersRetry() {
        String noSalutationJson = """
            {
              "id": "prayer-x",
              "topic": "anxiety",
              "text": "Lord, please help me through this difficult time. You know my worries and fears. Give me strength for today and hope for tomorrow. Remind me that I am not alone. I trust You with what I cannot see. Amen."
            }
            """;
        GenerateContentResponse noSalutation = mockResponseWithText(noSalutationJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(noSalutation).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(true));

        PrayerRequest request = new PrayerRequest("I'm anxious");
        PrayerResponseDto result = service.pray(request);

        assertThat(result.id()).isEqualTo("prayer-anxiety-gen-a8f3");
        verify(service, times(2)).callGeminiForPrayer(any(), anyBoolean());
        verify(service, times(1)).callGeminiForPrayer(any(), eq(true));
    }

    @Test
    @DisplayName("Text missing Amen triggers retry")
    void pray_textMissingAmenTriggersRetry() {
        String noAmenJson = """
            {
              "id": "prayer-x",
              "topic": "anxiety",
              "text": "Dear God, I come to You with my worries and fears. You know what I'm carrying today. Help me release it all into Your hands and trust that You are walking beside me through every step. I need Your peace."
            }
            """;
        GenerateContentResponse noAmen = mockResponseWithText(noAmenJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(noAmen).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(true));

        PrayerRequest request = new PrayerRequest("I'm anxious");
        PrayerResponseDto result = service.pray(request);

        assertThat(result.id()).isEqualTo("prayer-anxiety-gen-a8f3");
        verify(service, times(2)).callGeminiForPrayer(any(), anyBoolean());
    }

    @Test
    @DisplayName("Invalid topic (not in ALLOWED_TOPICS) triggers retry")
    void pray_invalidTopicTriggersRetry() {
        String invalidTopicJson = """
            {
              "id": "prayer-x",
              "topic": "fear",
              "text": "Dear God, I come to You with my worries and fears. You know what I'm carrying today. Help me release it all into Your hands and trust that You are walking beside me through every step. I need Your peace. Amen."
            }
            """;
        GenerateContentResponse invalidTopic = mockResponseWithText(invalidTopicJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(invalidTopic).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(true));

        PrayerRequest request = new PrayerRequest("I'm scared");
        PrayerResponseDto result = service.pray(request);

        assertThat(result.topic()).isEqualTo("anxiety"); // from the valid retry response
        verify(service, times(2)).callGeminiForPrayer(any(), anyBoolean());
    }

    @Test
    @DisplayName("Text too short (<50 chars) triggers retry")
    void pray_tooShortTriggersRetry() {
        String shortJson = """
            {
              "id": "prayer-x",
              "topic": "anxiety",
              "text": "Dear God, short prayer. Amen."
            }
            """;
        GenerateContentResponse tooShort = mockResponseWithText(shortJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(tooShort).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForPrayer(any(PrayerRequest.class), eq(true));

        PrayerRequest request = new PrayerRequest("I'm anxious");
        PrayerResponseDto result = service.pray(request);

        assertThat(result.id()).isEqualTo("prayer-anxiety-gen-a8f3");
        verify(service, times(2)).callGeminiForPrayer(any(), anyBoolean());
    }

    @Test
    @DisplayName("Two validation failures fall back to FALLBACK_PRAYER")
    void pray_twoValidationFailuresFallBackToCanned() {
        String bothBadJson = """
            {
              "id": "prayer-x",
              "topic": "anxiety",
              "text": "Hello there, this text does not start or end correctly but is long enough to pass the length check so the structural-invariant failure is what drives the retry-then-fallback path."
            }
            """;
        GenerateContentResponse bothBad = mockResponseWithText(bothBadJson);
        doReturn(bothBad).when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("I'm anxious");
        PrayerResponseDto result = service.pray(request);

        assertThat(result).isSameAs(PrayerService.FALLBACK_PRAYER);
        assertThat(result.id()).isEqualTo("fallback");
        verify(service, times(2)).callGeminiForPrayer(any(), anyBoolean());
    }

    // ---------- Error mapping (4 tests) ----------

    @Test
    @DisplayName("Null client throws UpstreamException with 'not configured' message")
    void pray_nullClient_throwsUpstreamNotConfigured() throws Exception {
        Field clientField = PrayerService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, null);

        PrayerRequest request = new PrayerRequest("Any prayer");

        assertThatThrownBy(() -> service.pray(request))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Safety-blocked response throws SafetyBlockException")
    void pray_safetyBlockThrowsSafetyBlockException() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        Candidate candidate = mock(Candidate.class);
        when(candidate.finishReason()).thenReturn(Optional.of(new FinishReason(FinishReason.Known.SAFETY)));
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of(candidate)));
        when(resp.text()).thenReturn("any text");
        doReturn(resp).when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("A hard prayer request");

        assertThatThrownBy(() -> service.pray(request))
            .isInstanceOf(SafetyBlockException.class);
    }

    @Test
    @DisplayName("promptFeedback.blockReason present throws SafetyBlockException (any reason)")
    void pray_promptFeedbackBlockReasonThrowsSafetyBlockException() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        GenerateContentResponsePromptFeedback feedback = mock(GenerateContentResponsePromptFeedback.class);
        when(feedback.blockReason()).thenReturn(Optional.of(new BlockedReason(BlockedReason.Known.SAFETY)));
        when(resp.promptFeedback()).thenReturn(Optional.of(feedback));
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        when(resp.text()).thenReturn("");
        doReturn(resp).when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("A hard prayer request");

        assertThatThrownBy(() -> service.pray(request))
            .isInstanceOf(SafetyBlockException.class);
        // Retry skipped — safety blocks bypass the retry loop.
        verify(service, times(1)).callGeminiForPrayer(any(), anyBoolean());
    }

    @Test
    @DisplayName("TimeoutException in cause chain maps to UpstreamTimeoutException")
    void pray_webClientTimeoutMapsTo504() {
        doThrow(new RuntimeException("request timed out", new TimeoutException("30s")))
            .when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("A prayer");

        assertThatThrownBy(() -> service.pray(request))
            .isInstanceOf(UpstreamTimeoutException.class)
            .hasMessageContaining("timed out");
    }

    @Test
    @DisplayName("Generic SDK exception maps to UpstreamException with generic message")
    void pray_sdkErrorMapsTo502() {
        doThrow(new RuntimeException("some internal sdk error"))
            .when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("A prayer");

        assertThatThrownBy(() -> service.pray(request))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("AI service is temporarily unavailable. Please try again.");
    }

    // ---------- No-leak invariant (1 test) ----------

    @Test
    @DisplayName("Upstream error text never leaks into thrown UpstreamException message")
    void noLeakOfUpstreamErrorText() {
        doThrow(new RuntimeException("GoogleSecretKeyABC key=AIzaSyEXAMPLE internal gemini detail"))
            .when(service).callGeminiForPrayer(any(PrayerRequest.class), anyBoolean());

        PrayerRequest request = new PrayerRequest("A prayer");

        try {
            service.pray(request);
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

    // ---------- Constants + structural invariants (2 tests) ----------

    @Test
    @DisplayName("FALLBACK_PRAYER matches structural invariant (Dear God + Amen + length + general topic)")
    void fallbackPrayer_matchesStructuralInvariant() {
        PrayerResponseDto fb = PrayerService.FALLBACK_PRAYER;

        assertThat(fb.text()).startsWith("Dear God");
        assertThat(fb.text()).endsWith("Amen.");
        assertThat(fb.text().length()).isBetween(100, 2000);
        assertThat(fb.topic()).isEqualTo("general");
        assertThat(fb.id()).isEqualTo("fallback");
        // Double-check via the validator
        assertThat(PrayerService.validateResponse(fb)).isTrue();
    }

    @Test
    @DisplayName("validateResponse rejects 6 off-pattern cases")
    void validateResponse_rejectsOffPattern() {
        // (a) no salutation
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "x", "anxiety",
            "Lord, please help me. I need You now. Give me strength to carry this burden. Amen."
        ))).isFalse();

        // (b) no Amen
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "x", "anxiety",
            "Dear God, I come to You with an open heart and ask for Your peace in this season of worry. Help me today."
        ))).isFalse();

        // (c) invalid topic
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "x", "fear",
            "Dear God, I come to You with my worries. Help me trust You in the unknown. Give me courage for today. Amen."
        ))).isFalse();

        // (d) too short (<50 chars)
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "x", "anxiety",
            "Dear God, short. Amen."
        ))).isFalse();

        // (e) too long (>2000 chars). Construct with valid salutation + Amen but excessive body.
        String longText = "Dear God, " + "a".repeat(2000) + " Amen.";
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "x", "anxiety", longText
        ))).isFalse();

        // (f) blank fields
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "", "anxiety",
            "Dear God, help me. Amen."
        ))).isFalse();
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "x", "",
            "Dear God, help me today in every way I need Your presence. Fill my heart with Your peace. Amen."
        ))).isFalse();
        assertThat(PrayerService.validateResponse(new PrayerResponseDto(
            "x", "anxiety", ""
        ))).isFalse();
    }
}
