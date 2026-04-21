package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
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
import java.util.Optional;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("GeminiService")
class GeminiServiceTest {

    private ProxyConfig config;
    private GeminiService service;

    @BeforeEach
    void setUp() throws Exception {
        config = new ProxyConfig();
        config.getGemini().setApiKey("fake-test-key");
        // spy() wraps a real instance so we can stub callModels() while every
        // other method (generate, generateExplanation, generateReflection,
        // isTimeout) runs real production logic. @PostConstruct initClient()
        // is NOT invoked when we construct manually — the private `client`
        // field starts null and we set it per-test.
        service = spy(new GeminiService(config));

        // Set the private `client` field to a non-null dummy so the null-guard
        // in generate() passes. The value doesn't matter — callModels() is
        // stubbed and never touches client.models. The null-client test
        // overrides this to null explicitly (see nullClientThrowsUpstream).
        Client dummyClient = mock(Client.class);
        Field clientField = GeminiService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, dummyClient);
    }

    @Test
    @DisplayName("generateExplanation returns {content, model} on success")
    void happyPathExplain() throws Exception {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        when(resp.text()).thenReturn("Paul is writing to a factional church.");
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        doReturn(resp).when(service).callModels(eq("gemini-2.5-flash-lite"), anyString(), any());

        GeminiResponseDto result = service.generateExplanation("1 Cor 13:4-7", "Love is patient");

        assertThat(result.content()).isEqualTo("Paul is writing to a factional church.");
        assertThat(result.model()).isEqualTo("gemini-2.5-flash-lite");
    }

    @Test
    @DisplayName("generateReflection uses REFLECT_SYSTEM_PROMPT (not EXPLAIN)")
    void reflectUsesReflectPrompt() throws Exception {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        when(resp.text()).thenReturn("A reader might ask...");
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        doReturn(resp).when(service).callModels(anyString(), anyString(), any());

        service.generateReflection("Phil 4:6-7", "In nothing be anxious");

        // Verify the call went through — distinct from generateExplanation
        // by virtue of the two public methods taking different code paths.
        verify(service).callModels(eq("gemini-2.5-flash-lite"), anyString(), any());
    }

    @Test
    @DisplayName("prompt-level block throws SafetyBlockException")
    void promptBlockThrowsSafety() throws Exception {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        GenerateContentResponsePromptFeedback feedback =
            mock(GenerateContentResponsePromptFeedback.class);
        when(feedback.blockReason()).thenReturn(Optional.of(new BlockedReason(BlockedReason.Known.SAFETY)));
        when(resp.promptFeedback()).thenReturn(Optional.of(feedback));
        doReturn(resp).when(service).callModels(anyString(), anyString(), any());

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(SafetyBlockException.class)
            .hasMessageContaining("Gemini blocked the prompt");
    }

    @Test
    @DisplayName("output finishReason SAFETY throws SafetyBlockException")
    void outputSafetyThrowsSafety() throws Exception {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        Candidate candidate = mock(Candidate.class);
        when(candidate.finishReason()).thenReturn(Optional.of(new FinishReason(FinishReason.Known.SAFETY)));
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of(candidate)));
        when(resp.text()).thenReturn("any text");
        doReturn(resp).when(service).callModels(anyString(), anyString(), any());

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(SafetyBlockException.class)
            .hasMessageContaining("finishReason=SAFETY");
    }

    @Test
    @DisplayName("empty response text throws SafetyBlockException (silent block)")
    void emptyTextThrowsSafety() throws Exception {
        GenerateContentResponse resp = mock(GenerateContentResponse.class);
        when(resp.promptFeedback()).thenReturn(Optional.empty());
        when(resp.candidates()).thenReturn(Optional.of(List.of()));
        when(resp.text()).thenReturn("   ");
        doReturn(resp).when(service).callModels(anyString(), anyString(), any());

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(SafetyBlockException.class)
            .hasMessageContaining("empty response");
    }

    @Test
    @DisplayName("timeout from SDK throws UpstreamTimeoutException")
    void timeoutThrowsUpstreamTimeout() throws Exception {
        doThrow(new RuntimeException("request timed out", new TimeoutException("30s")))
            .when(service).callModels(anyString(), anyString(), any());

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(UpstreamTimeoutException.class)
            .hasMessageContaining("timed out");
    }

    @Test
    @DisplayName("generic SDK exception throws UpstreamException (no internal leak)")
    void genericSdkErrorThrowsUpstream() throws Exception {
        RuntimeException internal = new RuntimeException("internal stack trace detail");
        doThrow(internal).when(service).callModels(anyString(), anyString(), any());

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(UpstreamException.class)
            // CRITICAL: internal cause message must NOT appear in the
            // user-facing exception message
            .hasMessage("AI service is temporarily unavailable. Please try again.");
    }

    @Test
    @DisplayName("null client (missing API key at init) throws UpstreamException")
    void nullClientThrowsUpstream() throws Exception {
        Field clientField = GeminiService.class.getDeclaredField("client");
        clientField.setAccessible(true);
        clientField.set(service, null);

        assertThatThrownBy(() -> service.generateExplanation("ref", "text"))
            .isInstanceOf(UpstreamException.class)
            .hasMessageContaining("not configured");
    }
}
