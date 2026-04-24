package com.worshiproom.proxy.ai;

import com.worshiproom.config.ProxyConfig;
import com.worshiproom.proxy.common.ProxyException;
import com.worshiproom.proxy.common.SafetyBlockException;
import com.worshiproom.proxy.common.UpstreamException;
import com.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.Candidate;
import com.google.genai.types.Content;
import com.google.genai.types.FinishReason;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.GenerateContentResponsePromptFeedback;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.Part;
import com.google.genai.types.Schema;
import com.google.genai.types.Type;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeoutException;

/**
 * Server-side Gemini caller for the Journal Reflection endpoint. Mirrors
 * {@link PrayerService} structurally with a handful of simplifications:
 * <ul>
 *   <li>No regex constants (no "Dear God / Amen." structural invariant)</li>
 *   <li>No topic enum (response DTO has only {@code id} and {@code text})</li>
 *   <li>Length-only validation (50–800 chars)</li>
 * </ul>
 *
 * Layered defenses (in order):
 * 1. {@link JournalReflectionCrisisDetector#detectsCrisis} — bypasses Gemini entirely on match
 * 2. Gemini with {@code responseMimeType="application/json"} + {@code responseSchema}
 * 3. {@link #parseAndValidate} — JSON parse + length + blank-field validation; null → retry
 * 4. Retry with {@link JournalReflectionPrompts#RETRY_CORRECTIVE_SUFFIX} appended
 * 5. {@link #FALLBACK_REFLECTION} — server-owned canned reflection after retries exhausted
 *
 * The D2b pattern (package-private {@link #callGeminiForReflection} + {@link #callModels}
 * seams) supports {@code Mockito.spy()} unit testing.
 */
@Service
public class JournalReflectionService {

    private static final Logger log = LoggerFactory.getLogger(JournalReflectionService.class);
    private static final String MODEL = "gemini-2.5-flash-lite";
    private static final int MAX_RETRIES_ON_VALIDATION_FAILURE = 1;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);
    private static final int MIN_TEXT_LENGTH = 50;
    private static final int MAX_TEXT_LENGTH = 800;

    private final ProxyConfig proxyConfig;
    private final ObjectMapper objectMapper;
    private Client client;  // null until initClient() runs; may stay null if key not configured

    public JournalReflectionService(ProxyConfig proxyConfig, ObjectMapper objectMapper) {
        this.proxyConfig = proxyConfig;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void initClient() {
        String apiKey = proxyConfig.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/reflect-journal will return 502 UPSTREAM_ERROR until it is set.");
            this.client = null;
            return;
        }
        HttpOptions httpOptions = HttpOptions.builder()
                .timeout((int) REQUEST_TIMEOUT.toMillis())
                .build();
        this.client = Client.builder()
                .apiKey(apiKey)
                .httpOptions(httpOptions)
                .build();
    }

    public boolean isConfigured() {
        return client != null;
    }

    /**
     * Orchestrates the full request lifecycle:
     * 1. Crisis check → canned reflection, no Gemini call
     * 2. Gemini structured-output call with retry on validation failure
     * 3. Final fallback to server-owned canned reflection on repeated failure
     */
    public JournalReflectionResponseDto reflect(JournalReflectionRequest request) {
        if (JournalReflectionCrisisDetector.detectsCrisis(request.entry())) {
            log.info("Journal reflection crisis path triggered entryLength={}", request.entry().length());
            return JournalReflectionCrisisDetector.buildCrisisResponse();
        }

        if (client == null) {
            throw new UpstreamException("AI service is not configured on the server.");
        }

        int attempts = 0;
        while (attempts <= MAX_RETRIES_ON_VALIDATION_FAILURE) {
            try {
                GenerateContentResponse response = callGeminiForReflection(request, attempts > 0);
                JournalReflectionResponseDto dto = parseAndValidate(response);
                if (dto != null) {
                    return dto;
                }
                log.info("Journal reflection validation failed attempt={}", attempts + 1);
                attempts++;
            } catch (SafetyBlockException | UpstreamException | UpstreamTimeoutException ex) {
                throw ex;
            } catch (RuntimeException ex) {
                throw mapGeminiException(ex);
            }
        }

        log.warn("Journal reflection retries exhausted entryLength={}", request.entry().length());
        return FALLBACK_REFLECTION;
    }

    /**
     * Package-private test seam (D2b pattern). Wraps the raw Gemini SDK call.
     * Spy on JournalReflectionService and doReturn(...) on this method in tests.
     *
     * @param withRetryCorrective if true, appends JournalReflectionPrompts.RETRY_CORRECTIVE_SUFFIX
     */
    GenerateContentResponse callGeminiForReflection(JournalReflectionRequest request, boolean withRetryCorrective) {
        String systemPrompt = JournalReflectionPrompts.REFLECTION_SYSTEM_PROMPT
            + (withRetryCorrective ? JournalReflectionPrompts.RETRY_CORRECTIVE_SUFFIX : "");
        String userPrompt = "Journal entry:\n\n" + request.entry();

        GenerateContentConfig config = GenerateContentConfig.builder()
            .systemInstruction(Content.fromParts(Part.fromText(systemPrompt)))
            .responseMimeType("application/json")
            .responseSchema(buildResponseSchema())
            .build();

        return callModels(MODEL, userPrompt, config);
    }

    /**
     * Package-private test seam matching AI-1 / AI-2 pattern. See Spec 2 D2b for the
     * reflection-over-final-field problem this avoids.
     */
    GenerateContentResponse callModels(String model, String userPrompt, GenerateContentConfig config) {
        return client.models.generateContent(model, userPrompt, config);
    }

    /**
     * Builds the JSON schema Gemini must follow. Two fields: id (string), text (string).
     * Post-parse {@link #validateResponse} is the authoritative length check.
     */
    private static Schema buildResponseSchema() {
        return Schema.builder()
            .type(new Type(Type.Known.OBJECT))
            .properties(Map.of(
                "id", Schema.builder().type(new Type(Type.Known.STRING)).build(),
                "text", Schema.builder().type(new Type(Type.Known.STRING)).minLength(50L).build()
            ))
            .required(List.of("id", "text"))
            .build();
    }

    /**
     * Parses Gemini's text response (expected JSON due to structured-output mode) into
     * JournalReflectionResponseDto and validates business rules. Returns null on parse
     * or validation failure — caller retries.
     *
     * Safety-block detection runs first, before JSON parsing. Same three-path check as
     * PrayerService / AskService.
     */
    private JournalReflectionResponseDto parseAndValidate(GenerateContentResponse response) {
        if (isSafetyBlocked(response)) {
            throw new SafetyBlockException("This journal entry was blocked by safety filters. Please rephrase.");
        }

        String text = extractText(response);
        if (text == null || text.isBlank()) {
            return null;  // empty → retry
        }

        JournalReflectionResponseDto dto;
        try {
            dto = objectMapper.readValue(text, JournalReflectionResponseDto.class);
        } catch (Exception parseEx) {
            log.info("Journal reflection JSON parse failed: {}", parseEx.getClass().getSimpleName());
            return null;  // parse error → retry
        }

        if (!validateResponse(dto)) {
            return null;  // validation failure → retry
        }

        return dto;
    }

    /**
     * Returns false if the DTO fails business validation.
     * Package-private so same-package tests can call directly without reflection.
     *
     * Length-only validation — no regex, no enum check. Simply non-blank fields and
     * text length within [MIN_TEXT_LENGTH, MAX_TEXT_LENGTH].
     */
    static boolean validateResponse(JournalReflectionResponseDto dto) {
        if (dto == null) return false;
        if (isBlank(dto.id()) || isBlank(dto.text())) return false;
        int len = dto.text().length();
        if (len < MIN_TEXT_LENGTH || len > MAX_TEXT_LENGTH) return false;
        return true;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    /** Three-path safety detection matching PrayerService / AskService pattern (D9 enum-based). */
    private static boolean isSafetyBlocked(GenerateContentResponse response) {
        if (response == null) return false;
        Optional<GenerateContentResponsePromptFeedback> feedback = response.promptFeedback();
        if (feedback.isPresent() && feedback.get().blockReason().isPresent()) {
            return true;
        }
        List<Candidate> candidates = response.candidates().orElse(List.of());
        if (!candidates.isEmpty()) {
            Candidate first = candidates.get(0);
            Optional<FinishReason> fr = first.finishReason();
            if (fr.isPresent()) {
                FinishReason.Known reason = fr.get().knownEnum();
                if (reason == FinishReason.Known.SAFETY) return true;
                if (reason == FinishReason.Known.PROHIBITED_CONTENT) return true;
            }
        }
        return false;
    }

    /** Null-safe extraction of the response's first candidate's text. */
    private static String extractText(GenerateContentResponse response) {
        if (response == null) return null;
        String aggregated = response.text();
        if (aggregated != null && !aggregated.isBlank()) {
            return aggregated;
        }
        List<Candidate> candidates = response.candidates().orElse(List.of());
        if (candidates.isEmpty()) return null;
        Optional<Content> content = candidates.get(0).content();
        if (content.isEmpty()) return null;
        List<Part> parts = content.get().parts().orElse(List.of());
        if (parts.isEmpty()) return null;
        return parts.get(0).text().orElse(null);
    }

    private static ProxyException mapGeminiException(RuntimeException ex) {
        // Match AI-1 AskService / AI-2 PrayerService — never leak upstream text.
        // Both UpstreamException and UpstreamTimeoutException extend ProxyException,
        // so the return type is their common supertype.
        if (isTimeout(ex)) {
            return new UpstreamTimeoutException("AI service timed out. Please try again.", ex);
        }
        return new UpstreamException("AI service is temporarily unavailable. Please try again.", ex);
    }

    private static boolean isTimeout(Throwable ex) {
        Throwable cur = ex;
        while (cur != null) {
            if (cur instanceof TimeoutException) return true;
            if (cur.getCause() == cur) return false; // self-referential guard
            cur = cur.getCause();
        }
        return false;
    }

    /** Server-side canned reflection when all retries exhausted. See spec AD #14. */
    static final JournalReflectionResponseDto FALLBACK_REFLECTION = new JournalReflectionResponseDto(
        "fallback",
        "Thank you for bringing these words here. The act of writing is itself a quiet form of prayer, "
            + "and God meets you in it — whether the page is full of joy, struggle, questions, or everything at once. "
            + "Keep showing up. What you wrote mattered today."
    );
}
