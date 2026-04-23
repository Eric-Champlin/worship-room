package com.worshiproom.proxy.ai;

import com.worshiproom.config.ProxyConfig;
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

/**
 * Server-side Gemini caller for the Ask endpoint. Wraps the google-genai Java
 * SDK with structured-output prompting, a retry-on-validation-failure loop,
 * a server-side canned fallback, and a crisis-keyword short-circuit.
 *
 * Layered defenses (in order):
 * 1. {@link AskCrisisDetector#detectsCrisis} — bypasses Gemini entirely on match
 * 2. Gemini with {@code responseMimeType="application/json"} + {@code responseSchema}
 * 3. {@link #parseAndValidate} — JSON parse + business rule validation; returns null → retry
 * 4. Retry with {@link AskPrompts#RETRY_CORRECTIVE_SUFFIX} appended to the system prompt
 * 5. {@link #FALLBACK_RESPONSE} — server-owned canned response after retries exhausted
 *
 * The D2b pattern (package-private {@link #callGeminiForAsk} + {@link #callModels}
 * seams) supports {@code Mockito.spy()} unit testing. Matches Spec 2's
 * {@code GeminiService} exactly.
 */
@Service
public class AskService {

    private static final Logger log = LoggerFactory.getLogger(AskService.class);
    private static final String MODEL = "gemini-2.5-flash-lite";
    private static final int MAX_RETRIES_ON_VALIDATION_FAILURE = 1;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final ProxyConfig proxyConfig;
    private final ObjectMapper objectMapper;
    private Client client;  // null until initClient() runs; may stay null if key not configured

    public AskService(ProxyConfig proxyConfig, ObjectMapper objectMapper) {
        this.proxyConfig = proxyConfig;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void initClient() {
        String apiKey = proxyConfig.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/ask will return 502 UPSTREAM_ERROR until it is set.");
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

    /** Exposed for ApiController composability (future health field). Not currently consumed. */
    public boolean isConfigured() {
        return client != null;
    }

    /**
     * Orchestrates the full request lifecycle:
     * 1. Crisis check → canned response, no Gemini call
     * 2. Gemini structured-output call with retry on validation failure
     * 3. Final fallback to server-owned canned response on repeated failure
     */
    public AskResponseDto ask(AskRequest request) {
        // Step 1: Crisis check (server-side, defense-in-depth)
        if (AskCrisisDetector.detectsCrisis(request.question())) {
            log.info("Ask crisis path triggered questionLength={}", request.question().length());
            return AskCrisisDetector.buildCrisisResponse();
        }

        // Step 2: Ensure Gemini is configured
        if (client == null) {
            throw new UpstreamException("AI service is not configured on the server.");
        }

        // Step 3: Call Gemini with retry-on-validation-failure
        int attempts = 0;
        while (attempts <= MAX_RETRIES_ON_VALIDATION_FAILURE) {
            try {
                GenerateContentResponse response = callGeminiForAsk(request, attempts > 0);
                AskResponseDto dto = parseAndValidate(response);
                if (dto != null) {
                    return dto;
                }
                log.info("Ask response validation failed attempt={}", attempts + 1);
                attempts++;
            } catch (SafetyBlockException | UpstreamException | UpstreamTimeoutException ex) {
                throw ex;  // let handler map these
            } catch (RuntimeException ex) {
                throw mapGeminiException(ex);
            }
        }

        // Step 4: Both attempts exhausted — return server-side fallback
        log.warn("Ask retries exhausted questionLength={}", request.question().length());
        return FALLBACK_RESPONSE;
    }

    /**
     * Package-private test seam (D2b pattern). Wraps the raw Gemini SDK call.
     * Spy on AskService and doReturn(...) on this method in tests.
     *
     * @param withRetryCorrective if true, appends AskPrompts.RETRY_CORRECTIVE_SUFFIX
     */
    GenerateContentResponse callGeminiForAsk(AskRequest request, boolean withRetryCorrective) {
        String systemPrompt = AskPrompts.ASK_SYSTEM_PROMPT
            + (withRetryCorrective ? AskPrompts.RETRY_CORRECTIVE_SUFFIX : "");
        String userPrompt = AskPrompts.buildUserPrompt(request.question(), request.conversationHistory());

        GenerateContentConfig config = GenerateContentConfig.builder()
            .systemInstruction(Content.fromParts(Part.fromText(systemPrompt)))
            .responseMimeType("application/json")
            .responseSchema(buildResponseSchema())
            .build();

        return callModels(MODEL, userPrompt, config);
    }

    /**
     * Package-private test seam matching Spec 2's pattern. See Spec 2 D2b for the
     * reflection-over-final-field problem this avoids.
     */
    GenerateContentResponse callModels(String model, String userPrompt, GenerateContentConfig config) {
        return client.models.generateContent(model, userPrompt, config);
    }

    /**
     * Builds the JSON schema Gemini must follow.
     *
     * The schema enforces: exactly 3 verses (each with reference/text/explanation),
     * exactly 3 follow-up questions, id from an enum of 16 values, plus minimum-length
     * hints for answer and prayer. The post-parse {@link #validateResponse} method is
     * the authoritative check — schema is first-line defense.
     */
    private static Schema buildResponseSchema() {
        Schema verseSchema = Schema.builder()
            .type(new Type(Type.Known.OBJECT))
            .properties(Map.of(
                "reference", Schema.builder().type(new Type(Type.Known.STRING)).build(),
                "text", Schema.builder().type(new Type(Type.Known.STRING)).build(),
                "explanation", Schema.builder().type(new Type(Type.Known.STRING)).build()
            ))
            .required(List.of("reference", "text", "explanation"))
            .build();

        Schema versesArraySchema = Schema.builder()
            .type(new Type(Type.Known.ARRAY))
            .items(verseSchema)
            .minItems(3L)
            .maxItems(3L)
            .build();

        Schema followUpsSchema = Schema.builder()
            .type(new Type(Type.Known.ARRAY))
            .items(Schema.builder().type(new Type(Type.Known.STRING)).build())
            .minItems(3L)
            .maxItems(3L)
            .build();

        Schema idSchema = Schema.builder()
            .type(new Type(Type.Known.STRING))
            .enum_(List.of(
                "suffering", "forgiveness", "anxiety", "purpose", "doubt", "prayer",
                "grief", "loneliness", "anger", "marriage", "parenting", "money",
                "identity", "temptation", "afterlife", "fallback"
            ))
            .build();

        return Schema.builder()
            .type(new Type(Type.Known.OBJECT))
            .properties(Map.of(
                "id", idSchema,
                "topic", Schema.builder().type(new Type(Type.Known.STRING)).build(),
                "answer", Schema.builder().type(new Type(Type.Known.STRING)).minLength(50L).build(),
                "verses", versesArraySchema,
                "encouragement", Schema.builder().type(new Type(Type.Known.STRING)).build(),
                "prayer", Schema.builder().type(new Type(Type.Known.STRING)).minLength(30L).build(),
                "followUpQuestions", followUpsSchema
            ))
            .required(List.of("id", "topic", "answer", "verses", "encouragement", "prayer", "followUpQuestions"))
            .build();
    }

    /**
     * Parses Gemini's text response (expected JSON due to structured-output mode) into
     * AskResponseDto and validates business rules. Returns null on parse or validation
     * failure — caller retries.
     *
     * Safety-block detection runs here too, before JSON parsing. Same three-path check
     * Spec 2 uses in GeminiService.
     */
    private AskResponseDto parseAndValidate(GenerateContentResponse response) {
        // Three-path safety detection (Spec 2 D9 pattern, enum-based)
        if (isSafetyBlocked(response)) {
            throw new SafetyBlockException("This question was blocked by safety filters. Please rephrase.");
        }

        String text = extractText(response);
        if (text == null || text.isBlank()) {
            return null;  // empty → retry
        }

        AskResponseDto dto;
        try {
            dto = objectMapper.readValue(text, AskResponseDto.class);
        } catch (Exception parseEx) {
            log.info("Ask JSON parse failed: {}", parseEx.getClass().getSimpleName());
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
     */
    static boolean validateResponse(AskResponseDto dto) {
        if (dto == null) return false;
        if (isBlank(dto.id()) || isBlank(dto.topic()) || isBlank(dto.answer())
            || isBlank(dto.encouragement()) || isBlank(dto.prayer())) return false;
        if (!ALLOWED_IDS.contains(dto.id())) return false;
        if (dto.verses() == null || dto.verses().size() != 3) return false;
        for (AskVerseDto v : dto.verses()) {
            if (v == null || isBlank(v.reference()) || isBlank(v.text()) || isBlank(v.explanation())) return false;
        }
        if (dto.followUpQuestions() == null || dto.followUpQuestions().size() != 3) return false;
        for (String q : dto.followUpQuestions()) {
            if (isBlank(q)) return false;
        }
        return true;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    static final Set<String> ALLOWED_IDS = Set.of(
        "suffering", "forgiveness", "anxiety", "purpose", "doubt", "prayer",
        "grief", "loneliness", "anger", "marriage", "parenting", "money",
        "identity", "temptation", "afterlife", "fallback"
    );

    /** Three-path safety detection matching Spec 2 GeminiService pattern (D9 enum-based). */
    private static boolean isSafetyBlocked(GenerateContentResponse response) {
        if (response == null) return false;
        Optional<GenerateContentResponsePromptFeedback> feedback = response.promptFeedback();
        if (feedback.isPresent() && feedback.get().blockReason().isPresent()) {
            // Any blockReason (SAFETY, OTHER, BLOCKLIST, IMAGE_SAFETY, ...) means
            // Gemini refused the prompt. Matches Spec 2 GeminiService behavior —
            // surface a 422 "please rephrase" instead of burning a retry round trip
            // and returning the generic server-side fallback. The finishReason check
            // below stays enum-specific because SAFETY / PROHIBITED_CONTENT are the
            // only candidate-level values that indicate content refusal there.
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
        // Prefer the SDK's built-in aggregator when available — it concatenates
        // all text parts across candidates and handles thought-part filtering.
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

    private static com.worshiproom.proxy.common.ProxyException mapGeminiException(RuntimeException ex) {
        // Match Spec 2 GeminiService.mapException — never leak upstream text.
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

    /** Server-side canned response when all retries exhausted. See Architecture Decision #12. */
    static final AskResponseDto FALLBACK_RESPONSE = new AskResponseDto(
        "fallback",
        "Seeking Wisdom",
        "That's a deep question, and I want to honor it with a thoughtful answer. "
            + "I'm having trouble reaching our AI service right now — but Scripture has "
            + "wisdom for every question you bring. Take a moment to pray, open the Bible "
            + "to a passage that speaks to you, or explore the topics below. You're not "
            + "alone in wondering.",
        List.of(
            new AskVerseDto(
                "Psalm 46:10",
                "Be still, and know that I am God.",
                "Sometimes the answer isn't another piece of information — it's slowing down enough to hear God in the quiet."
            ),
            new AskVerseDto(
                "Proverbs 3:5-6",
                "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
                "Trusting God's wisdom above your own opens the door for his guidance in every situation."
            ),
            new AskVerseDto(
                "Matthew 7:7",
                "Ask, and it will be given you. Seek, and you will find. Knock, and it will be opened for you.",
                "God honors the honest question. Asking is itself an act of faith."
            )
        ),
        "God hears every question of your heart. Keep asking.",
        "Lord, I don't have all the answers, and right now I can't see the path clearly. Help me to trust you in what I don't understand. Give me patience to wait on your wisdom and courage to keep asking. Amen.",
        List.of(
            "How does the Bible say to handle uncertainty?",
            "What does it mean to trust God?",
            "How can I grow in faith today?"
        )
    );
}
