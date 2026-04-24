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
import org.mockito.ArgumentCaptor;

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

@DisplayName("AskService")
class AskServiceTest {

    private ProxyConfig config;
    private AskService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        config = new ProxyConfig();
        config.getGemini().setApiKey("fake-test-key");
        objectMapper = new ObjectMapper();
        service = spy(new AskService(config, objectMapper));
        // @PostConstruct initClient() doesn't fire with manual new — inject a
        // non-null Client so the null-guard in ask() passes. The mock Client is
        // never actually invoked because callGeminiForAsk / callModels are stubbed
        // via doReturn() in each test.
        Client dummyClient = mock(Client.class);
        Field clientField = AskService.class.getDeclaredField("client");
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
              "id": "suffering",
              "topic": "Why Suffering Exists",
              "answer": "Suffering is one of the hardest questions in the Christian life, and Scripture doesn't pretend otherwise. Job cried out, the psalmists lamented, and Jesus himself wept at a friend's tomb.",
              "verses": [
                {"reference": "Romans 8:28", "text": "We know that all things work together for good for those who love God.", "explanation": "God is at work even in the hardest seasons."},
                {"reference": "Psalm 34:18", "text": "Yahweh is near to those who have a broken heart.", "explanation": "You are not alone in pain."},
                {"reference": "2 Corinthians 1:3-4", "text": "Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies.", "explanation": "God comforts us so we can comfort others."}
              ],
              "encouragement": "God is close when you hurt.",
              "prayer": "Lord, I don't understand this pain. Would you sit with me here? Help me trust you even when I can't see the way through. Amen.",
              "followUpQuestions": ["How do I trust God in hard times?", "What does Scripture say about lament?", "How can suffering deepen faith?"]
            }
            """;
    }

    private AskResponseDto validDto() {
        try {
            return objectMapper.readValue(validResponseJson(), AskResponseDto.class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // ---------- Crisis path (2 tests) ----------

    @Test
    @DisplayName("Crisis keyword short-circuits, never calls Gemini")
    void ask_crisisKeywordShortCircuits() {
        AskRequest request = new AskRequest("I want to die", null);

        AskResponseDto result = service.ask(request);

        assertThat(result.id()).isEqualTo("crisis");
        verify(service, never()).callGeminiForAsk(any(), anyBoolean());
    }

    @Test
    @DisplayName("Crisis response has expected shape")
    void ask_crisisResponseHasExpectedShape() {
        AskRequest request = new AskRequest("I'm thinking about suicide", null);

        AskResponseDto result = service.ask(request);

        assertThat(result.id()).isEqualTo("crisis");
        assertThat(result.topic()).isEqualTo("Help is available");
        assertThat(result.answer()).contains("988");
        assertThat(result.verses()).hasSize(3);
        assertThat(result.followUpQuestions()).hasSize(3);
    }

    // ---------- Happy path (3 tests) ----------

    @Test
    @DisplayName("Happy path: valid Gemini response returns parsed DTO")
    void ask_happyPath_returnsValidResponse() {
        GenerateContentResponse mockResp = mockResponseWithText(validResponseJson());
        doReturn(mockResp).when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("Why does God allow suffering?", null);
        AskResponseDto result = service.ask(request);

        assertThat(result.id()).isEqualTo("suffering");
        assertThat(result.verses()).hasSize(3);
        assertThat(result.followUpQuestions()).hasSize(3);
        verify(service, times(1)).callGeminiForAsk(any(), anyBoolean());
    }

    @Test
    @DisplayName("Conversation history is passed through to callGeminiForAsk")
    void ask_conversationHistoryPassedToPrompt() {
        GenerateContentResponse mockResp = mockResponseWithText(validResponseJson());
        doReturn(mockResp).when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        List<ConversationMessage> history = List.of(
            new ConversationMessage("user", "First question"),
            new ConversationMessage("assistant", "First answer")
        );
        AskRequest request = new AskRequest("Follow-up question", history);
        service.ask(request);

        ArgumentCaptor<AskRequest> captor = ArgumentCaptor.forClass(AskRequest.class);
        verify(service).callGeminiForAsk(captor.capture(), anyBoolean());
        assertThat(captor.getValue().conversationHistory()).hasSize(2);
    }

    @Test
    @DisplayName("Null conversationHistory is accepted without NPE")
    void ask_nullConversationHistoryHandled() {
        GenerateContentResponse mockResp = mockResponseWithText(validResponseJson());
        doReturn(mockResp).when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("A simple question", null);
        AskResponseDto result = service.ask(request);

        assertThat(result).isNotNull();
    }

    // ---------- Validation + retry (4 tests) ----------

    @Test
    @DisplayName("Malformed JSON retries once with corrective suffix")
    void ask_malformedJsonRetriesOnce() {
        GenerateContentResponse garbage = mockResponseWithText("this is not json");
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        // First call returns garbage (false corrective), second call returns valid (true corrective)
        doReturn(garbage).when(service).callGeminiForAsk(any(AskRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForAsk(any(AskRequest.class), eq(true));

        AskRequest request = new AskRequest("Why?", null);
        AskResponseDto result = service.ask(request);

        assertThat(result.id()).isEqualTo("suffering");
        verify(service, times(2)).callGeminiForAsk(any(), anyBoolean());
        verify(service, times(1)).callGeminiForAsk(any(), eq(true));
    }

    @Test
    @DisplayName("Two verses instead of three triggers retry")
    void ask_twoVersesInsteadOfThreeTriggersRetry() {
        String twoVersesJson = """
            {
              "id": "anxiety",
              "topic": "Anxiety",
              "answer": "A fifty-character-plus answer here fills in the space so we get past the minLength threshold.",
              "verses": [
                {"reference": "A", "text": "a", "explanation": "a"},
                {"reference": "B", "text": "b", "explanation": "b"}
              ],
              "encouragement": "E",
              "prayer": "A prayer long enough to meet the thirty-character minimum for the prayer field here.",
              "followUpQuestions": ["Q1", "Q2", "Q3"]
            }
            """;
        GenerateContentResponse twoVerses = mockResponseWithText(twoVersesJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(twoVerses).when(service).callGeminiForAsk(any(AskRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForAsk(any(AskRequest.class), eq(true));

        AskRequest request = new AskRequest("Why?", null);
        AskResponseDto result = service.ask(request);

        assertThat(result.id()).isEqualTo("suffering");
        verify(service, times(2)).callGeminiForAsk(any(), anyBoolean());
    }

    @Test
    @DisplayName("Two malformed responses fall back to FALLBACK_RESPONSE")
    void ask_twoValidFailuresFallBackToCanned() {
        GenerateContentResponse garbage = mockResponseWithText("also not json");
        doReturn(garbage).when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("Why?", null);
        AskResponseDto result = service.ask(request);

        assertThat(result).isSameAs(AskService.FALLBACK_RESPONSE);
        assertThat(result.id()).isEqualTo("fallback");
        verify(service, times(2)).callGeminiForAsk(any(), anyBoolean());
    }

    @Test
    @DisplayName("Invalid id enum value triggers retry")
    void ask_invalidIdEnumValueTriggersRetry() {
        String invalidIdJson = """
            {
              "id": "unknown-topic",
              "topic": "Some topic",
              "answer": "A fifty-character-plus answer here fills in the space so we get past the minLength threshold.",
              "verses": [
                {"reference": "A", "text": "a", "explanation": "a"},
                {"reference": "B", "text": "b", "explanation": "b"},
                {"reference": "C", "text": "c", "explanation": "c"}
              ],
              "encouragement": "E",
              "prayer": "A prayer long enough to meet the thirty-character minimum for the prayer field here.",
              "followUpQuestions": ["Q1", "Q2", "Q3"]
            }
            """;
        GenerateContentResponse invalidId = mockResponseWithText(invalidIdJson);
        GenerateContentResponse valid = mockResponseWithText(validResponseJson());
        doReturn(invalidId).when(service).callGeminiForAsk(any(AskRequest.class), eq(false));
        doReturn(valid).when(service).callGeminiForAsk(any(AskRequest.class), eq(true));

        AskRequest request = new AskRequest("Why?", null);
        AskResponseDto result = service.ask(request);

        assertThat(result.id()).isEqualTo("suffering");
        verify(service, times(2)).callGeminiForAsk(any(), anyBoolean());
    }

    // ---------- Error mapping (4 tests) ----------

    @Test
    @DisplayName("Null client throws UpstreamException with 'not configured' message")
    void ask_nullClient_throwsUpstreamNotConfigured() throws Exception {
        Field clientField = AskService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, null);

        AskRequest request = new AskRequest("Any question", null);

        assertThatThrownBy(() -> service.ask(request))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
    }

    @Test
    @DisplayName("Safety-blocked response throws SafetyBlockException")
    void ask_safetyBlockThrowsSafetyBlockException() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        Candidate candidate = mock(Candidate.class);
        when(candidate.finishReason()).thenReturn(Optional.of(new FinishReason(FinishReason.Known.SAFETY)));
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of(candidate)));
        when(resp.text()).thenReturn("any text");
        doReturn(resp).when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("A hard question", null);

        assertThatThrownBy(() -> service.ask(request))
            .isInstanceOf(SafetyBlockException.class);
    }

    @Test
    @DisplayName("promptFeedback.blockReason present throws SafetyBlockException (any reason)")
    void ask_promptFeedbackBlockReasonThrowsSafetyBlockException() {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        GenerateContentResponsePromptFeedback feedback = mock(GenerateContentResponsePromptFeedback.class);
        when(feedback.blockReason()).thenReturn(Optional.of(new BlockedReason(BlockedReason.Known.SAFETY)));
        when(resp.promptFeedback()).thenReturn(Optional.of(feedback));
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        when(resp.text()).thenReturn("");
        doReturn(resp).when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("A hard question", null);

        assertThatThrownBy(() -> service.ask(request))
            .isInstanceOf(SafetyBlockException.class);
        // Retry is skipped — safety blocks bypass the retry loop.
        verify(service, times(1)).callGeminiForAsk(any(), anyBoolean());
    }

    @Test
    @DisplayName("TimeoutException in cause chain maps to UpstreamTimeoutException")
    void ask_webClientTimeoutMapsTo504() {
        doThrow(new RuntimeException("request timed out", new TimeoutException("30s")))
            .when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("A question", null);

        assertThatThrownBy(() -> service.ask(request))
            .isInstanceOf(UpstreamTimeoutException.class)
            .hasMessageContaining("timed out");
    }

    @Test
    @DisplayName("Generic SDK exception maps to UpstreamException with generic message")
    void ask_sdkErrorMapsTo502() {
        doThrow(new RuntimeException("some internal sdk error"))
            .when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("A question", null);

        assertThatThrownBy(() -> service.ask(request))
            .isInstanceOf(UpstreamException.class)
            .hasMessage("AI service is temporarily unavailable. Please try again.");
    }

    // ---------- No-leak invariants (2 tests) ----------

    @Test
    @DisplayName("Upstream error text never leaks into thrown UpstreamException message")
    void noLeakOfUpstreamErrorText() {
        doThrow(new RuntimeException("GoogleSecretKeyABC key=AIzaSyEXAMPLE internal gemini detail"))
            .when(service).callGeminiForAsk(any(AskRequest.class), anyBoolean());

        AskRequest request = new AskRequest("A question", null);

        try {
            service.ask(request);
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

    @Test
    @DisplayName("Crisis response contains no secrets")
    void noLeakInCrisisResponse() {
        AskResponseDto dto = AskCrisisDetector.buildCrisisResponse();
        String all = (dto.answer() + " " + dto.encouragement() + " " + dto.prayer())
            .toLowerCase(Locale.ROOT);

        assertThat(all).doesNotContain("aiza");
        assertThat(all).doesNotContain("gemini");
        assertThat(all).doesNotContain("google");
        assertThat(all).doesNotContain("key=");
    }

    // ---------- Validation unit tests (3 tests) ----------

    @Test
    @DisplayName("validateResponse accepts a fully-valid DTO")
    void validateResponse_acceptsValidDto() {
        assertThat(AskService.validateResponse(validDto())).isTrue();
    }

    @Test
    @DisplayName("validateResponse rejects DTOs with any blank required field")
    void validateResponse_rejectsEmptyFields() {
        AskResponseDto base = validDto();

        // Blank id
        assertThat(AskService.validateResponse(new AskResponseDto(
            "", base.topic(), base.answer(), base.verses(),
            base.encouragement(), base.prayer(), base.followUpQuestions()
        ))).isFalse();

        // Blank topic
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), "", base.answer(), base.verses(),
            base.encouragement(), base.prayer(), base.followUpQuestions()
        ))).isFalse();

        // Blank answer
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), base.topic(), "", base.verses(),
            base.encouragement(), base.prayer(), base.followUpQuestions()
        ))).isFalse();

        // Blank encouragement
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), base.topic(), base.answer(), base.verses(),
            "", base.prayer(), base.followUpQuestions()
        ))).isFalse();

        // Blank prayer
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), base.topic(), base.answer(), base.verses(),
            base.encouragement(), "", base.followUpQuestions()
        ))).isFalse();
    }

    @Test
    @DisplayName("validateResponse rejects DTOs with wrong array counts")
    void validateResponse_rejectsInvalidCounts() {
        AskResponseDto base = validDto();

        // 2 verses
        List<AskVerseDto> twoVerses = base.verses().subList(0, 2);
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), base.topic(), base.answer(), twoVerses,
            base.encouragement(), base.prayer(), base.followUpQuestions()
        ))).isFalse();

        // 4 verses
        List<AskVerseDto> fourVerses = List.of(
            base.verses().get(0), base.verses().get(1), base.verses().get(2),
            new AskVerseDto("X", "x", "x")
        );
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), base.topic(), base.answer(), fourVerses,
            base.encouragement(), base.prayer(), base.followUpQuestions()
        ))).isFalse();

        // 2 follow-ups
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), base.topic(), base.answer(), base.verses(),
            base.encouragement(), base.prayer(), List.of("Q1", "Q2")
        ))).isFalse();

        // 4 follow-ups
        assertThat(AskService.validateResponse(new AskResponseDto(
            base.id(), base.topic(), base.answer(), base.verses(),
            base.encouragement(), base.prayer(), List.of("Q1", "Q2", "Q3", "Q4")
        ))).isFalse();
    }

}
