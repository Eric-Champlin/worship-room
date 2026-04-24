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
import java.util.Set;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;

/**
 * Server-side Gemini caller for the Prayer endpoint. Wraps the google-genai Java
 * SDK with structured-output prompting, a retry-on-validation-failure loop, a
 * server-side canned fallback, and a crisis-keyword short-circuit.
 *
 * Layered defenses (in order):
 * 1. {@link PrayerCrisisDetector#detectsCrisis} — bypasses Gemini entirely on match
 * 2. Gemini with {@code responseMimeType="application/json"} + {@code responseSchema}
 * 3. {@link #parseAndValidate} — JSON parse + business rule validation (regex checks
 *    for the "Dear God...Amen." structural invariant plus topic + length bounds);
 *    returns null → retry
 * 4. Retry with {@link PrayerPrompts#RETRY_CORRECTIVE_SUFFIX} appended to the system prompt
 * 5. {@link #FALLBACK_PRAYER} — server-owned canned prayer after retries exhausted
 *
 * The D2b pattern (package-private {@link #callGeminiForPrayer} + {@link #callModels}
 * seams) supports {@code Mockito.spy()} unit testing. Matches AI-1's {@code AskService}
 * exactly.
 */
@Service
public class PrayerService {

    private static final Logger log = LoggerFactory.getLogger(PrayerService.class);
    private static final String MODEL = "gemini-2.5-flash-lite";
    private static final int MAX_RETRIES_ON_VALIDATION_FAILURE = 1;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private static final Pattern STARTS_WITH_SALUTATION =
        Pattern.compile("^Dear (God|Lord|Father)[,.]", Pattern.CASE_INSENSITIVE);
    private static final Pattern ENDS_WITH_AMEN =
        Pattern.compile("Amen\\.\\s*$");

    static final Set<String> ALLOWED_TOPICS = Set.of(
        "anxiety", "gratitude", "healing", "guidance", "grief",
        "forgiveness", "relationships", "strength", "general", "devotional"
    );

    private final ProxyConfig proxyConfig;
    private final ObjectMapper objectMapper;
    private Client client;  // null until initClient() runs; may stay null if key not configured

    public PrayerService(ProxyConfig proxyConfig, ObjectMapper objectMapper) {
        this.proxyConfig = proxyConfig;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void initClient() {
        String apiKey = proxyConfig.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/pray will return 502 UPSTREAM_ERROR until it is set.");
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
     * 1. Crisis check → canned prayer, no Gemini call
     * 2. Gemini structured-output call with retry on validation failure
     * 3. Final fallback to server-owned canned prayer on repeated failure
     */
    public PrayerResponseDto pray(PrayerRequest request) {
        if (PrayerCrisisDetector.detectsCrisis(request.request())) {
            log.info("Prayer crisis path triggered requestLength={}", request.request().length());
            return PrayerCrisisDetector.buildCrisisResponse();
        }

        if (client == null) {
            throw new UpstreamException("AI service is not configured on the server.");
        }

        int attempts = 0;
        while (attempts <= MAX_RETRIES_ON_VALIDATION_FAILURE) {
            try {
                GenerateContentResponse response = callGeminiForPrayer(request, attempts > 0);
                PrayerResponseDto dto = parseAndValidate(response);
                if (dto != null) {
                    return dto;
                }
                log.info("Prayer response validation failed attempt={}", attempts + 1);
                attempts++;
            } catch (SafetyBlockException | UpstreamException | UpstreamTimeoutException ex) {
                throw ex;
            } catch (RuntimeException ex) {
                throw mapGeminiException(ex);
            }
        }

        log.warn("Prayer retries exhausted requestLength={}", request.request().length());
        return FALLBACK_PRAYER;
    }

    /**
     * Package-private test seam (D2b pattern). Wraps the raw Gemini SDK call.
     * Spy on PrayerService and doReturn(...) on this method in tests.
     *
     * @param withRetryCorrective if true, appends PrayerPrompts.RETRY_CORRECTIVE_SUFFIX
     */
    GenerateContentResponse callGeminiForPrayer(PrayerRequest request, boolean withRetryCorrective) {
        String systemPrompt = PrayerPrompts.PRAYER_SYSTEM_PROMPT
            + (withRetryCorrective ? PrayerPrompts.RETRY_CORRECTIVE_SUFFIX : "");
        String userPrompt = "Prayer request: " + request.request();

        GenerateContentConfig config = GenerateContentConfig.builder()
            .systemInstruction(Content.fromParts(Part.fromText(systemPrompt)))
            .responseMimeType("application/json")
            .responseSchema(buildResponseSchema())
            .build();

        return callModels(MODEL, userPrompt, config);
    }

    /**
     * Package-private test seam matching AI-1 / Spec 2 pattern. See Spec 2 D2b for the
     * reflection-over-final-field problem this avoids.
     */
    GenerateContentResponse callModels(String model, String userPrompt, GenerateContentConfig config) {
        return client.models.generateContent(model, userPrompt, config);
    }

    /**
     * Builds the JSON schema Gemini must follow.
     *
     * The schema enforces a 3-field response (id, topic, text) with topic constrained to
     * one of 10 allowed values via {@code enum_} and text with a minLength floor.
     * The post-parse {@link #validateResponse} method is the authoritative check —
     * schema is first-line defense.
     */
    private static Schema buildResponseSchema() {
        Schema topicSchema = Schema.builder()
            .type(new Type(Type.Known.STRING))
            .enum_(List.of(
                "anxiety", "gratitude", "healing", "guidance", "grief",
                "forgiveness", "relationships", "strength", "general", "devotional"
            ))
            .build();

        return Schema.builder()
            .type(new Type(Type.Known.OBJECT))
            .properties(Map.of(
                "id", Schema.builder().type(new Type(Type.Known.STRING)).build(),
                "topic", topicSchema,
                "text", Schema.builder().type(new Type(Type.Known.STRING)).minLength(50L).build()
            ))
            .required(List.of("id", "topic", "text"))
            .build();
    }

    /**
     * Parses Gemini's text response (expected JSON due to structured-output mode) into
     * PrayerResponseDto and validates business rules. Returns null on parse or validation
     * failure — caller retries.
     *
     * Safety-block detection runs here too, before JSON parsing. Same three-path check
     * Spec 2 / AI-1 use.
     */
    private PrayerResponseDto parseAndValidate(GenerateContentResponse response) {
        // Three-path safety detection (Spec 2 D9 pattern, enum-based)
        if (isSafetyBlocked(response)) {
            throw new SafetyBlockException("This prayer request was blocked by safety filters. Please rephrase.");
        }

        String text = extractText(response);
        if (text == null || text.isBlank()) {
            return null;  // empty → retry
        }

        PrayerResponseDto dto;
        try {
            dto = objectMapper.readValue(text, PrayerResponseDto.class);
        } catch (Exception parseEx) {
            log.info("Prayer JSON parse failed: {}", parseEx.getClass().getSimpleName());
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
     * Validates: non-blank fields, topic in ALLOWED_TOPICS, text starts with "Dear
     * (God|Lord|Father)", text ends with "Amen.", text length between 50 and 2000 chars.
     */
    static boolean validateResponse(PrayerResponseDto dto) {
        if (dto == null) return false;
        if (isBlank(dto.id()) || isBlank(dto.topic()) || isBlank(dto.text())) return false;
        if (!ALLOWED_TOPICS.contains(dto.topic())) return false;
        if (!STARTS_WITH_SALUTATION.matcher(dto.text()).find()) return false;
        if (!ENDS_WITH_AMEN.matcher(dto.text()).find()) return false;
        int len = dto.text().length();
        if (len < 50 || len > 2000) return false;
        return true;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    /** Three-path safety detection matching Spec 2 / AI-1 pattern (D9 enum-based). */
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
        // Match Spec 2 GeminiService.mapException / AI-1 AskService.mapGeminiException —
        // never leak upstream text. Both UpstreamException and UpstreamTimeoutException
        // extend ProxyException, so the return type is their common supertype.
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

    /** Server-side canned prayer when all retries exhausted. See spec AD #14. */
    static final PrayerResponseDto FALLBACK_PRAYER = new PrayerResponseDto(
        "fallback",
        "general",
        "Dear God, I come before You with an open heart, even when I don't have all the words. "
            + "You know what I carry today — the hopes, the worries, the things I can't name. "
            + "Meet me in this moment. Fill me with Your peace, Your patience, and Your presence. "
            + "Help me to trust that You hear me even in the silence, that You are working even when I can't see it. "
            + "Draw me closer to You today. Amen."
    );
}
