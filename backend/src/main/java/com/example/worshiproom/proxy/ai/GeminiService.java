package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.google.genai.Client;
import com.google.genai.types.Candidate;
import com.google.genai.types.Content;
import com.google.genai.types.FinishReason;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.Part;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.TimeoutException;
import java.util.function.BiFunction;

/**
 * Server-side Gemini caller. Wraps the google-genai Java SDK, executes the
 * three-path safety check (prompt block, output block, silent empty), and
 * maps SDK exceptions to typed proxy exceptions from
 * {@code com.example.worshiproom.proxy.common}.
 *
 * The SDK client is lazily initialized in {@link #initClient()} and reused
 * for every request. On a missing or empty {@code GEMINI_API_KEY}, the
 * client is NOT created — every call throws {@link UpstreamException} with
 * a user-safe message ("AI service is not configured"). The frontend
 * surfaces this as a generic {@code GeminiApiError}; the actual error
 * context is visible to operators via the server log (with the request
 * ID).
 *
 * Timeout strategy: Gemini calls can take 10–20 seconds under normal load.
 * The shared {@code proxy.upstream.default-timeout-ms} (10s) is too short
 * for Gemini, so this service overrides it per-request by configuring the
 * SDK with a 30-second {@link HttpOptions#timeout} at client
 * construction. If the timeout fires, the SDK throws a wrapped
 * {@link TimeoutException}; we map to {@link UpstreamTimeoutException}
 * (HTTP 504).
 *
 * Thread safety: the SDK's {@code Client} is thread-safe and meant to be
 * reused (per google-genai docs). Stored in a private field after
 * construction.
 */
@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    static final String MODEL_ID = "gemini-2.5-flash-lite";
    static final int MAX_OUTPUT_TOKENS = 600;
    static final float TEMPERATURE = 0.7f;
    static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final ProxyConfig proxyConfig;
    private Client client;  // null until initClient() runs

    public GeminiService(ProxyConfig proxyConfig) {
        this.proxyConfig = proxyConfig;
    }

    @PostConstruct
    void initClient() {
        String apiKey = proxyConfig.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/* endpoints will return 502 UPSTREAM_ERROR until it is set.");
            this.client = null;
            return;
        }
        // HttpOptions lets us override the default HTTP-level timeout for
        // every request this client makes. google-genai bakes the timeout
        // into the SDK call path, so we don't need to layer a separate
        // executor timeout on top.
        HttpOptions httpOptions = HttpOptions.builder()
                .timeout((int) REQUEST_TIMEOUT.toMillis())
                .build();
        this.client = Client.builder()
                .apiKey(apiKey)
                .httpOptions(httpOptions)
                .build();
    }

    /**
     * Generate an explanation for the given passage. Delegates to the shared
     * {@link #generate} with the EXPLAIN prompt pair.
     */
    public GeminiResponseDto generateExplanation(String reference, String verseText) {
        return generate(
                reference,
                verseText,
                GeminiPrompts.EXPLAIN_SYSTEM_PROMPT,
                GeminiPrompts::buildExplainUserPrompt
        );
    }

    /**
     * Generate a reflection for the given passage. Delegates to the shared
     * {@link #generate} with the REFLECT prompt pair.
     */
    public GeminiResponseDto generateReflection(String reference, String verseText) {
        return generate(
                reference,
                verseText,
                GeminiPrompts.REFLECT_SYSTEM_PROMPT,
                GeminiPrompts::buildReflectUserPrompt
        );
    }

    /**
     * Shared implementation. Runs the SDK call, then the three-path safety
     * check, then returns a {@link GeminiResponseDto} on success.
     *
     * On any failure the method throws a subclass of
     * {@link com.example.worshiproom.proxy.common.ProxyException}, which
     * the shared {@code ProxyExceptionHandler} maps to the standard
     * {@code ProxyError} JSON body with the appropriate HTTP status.
     */
    GeminiResponseDto generate(
            String reference,
            String verseText,
            String systemPromptText,
            BiFunction<String, String, String> userPromptBuilder
    ) {
        if (client == null) {
            // Key was not configured at startup — see initClient().
            throw new UpstreamException("AI service is not configured on the server.");
        }

        String userPrompt = userPromptBuilder.apply(reference, verseText);
        Content systemInstruction = Content.fromParts(Part.fromText(systemPromptText));

        GenerateContentConfig config = GenerateContentConfig.builder()
                .systemInstruction(systemInstruction)
                .maxOutputTokens(MAX_OUTPUT_TOKENS)
                .temperature(TEMPERATURE)
                .build();

        GenerateContentResponse response;
        try {
            response = callModels(MODEL_ID, userPrompt, config);
        } catch (Exception ex) {
            // SDK exceptions are classified by unwrapping their cause chain.
            if (isTimeout(ex)) {
                throw new UpstreamTimeoutException(
                        "AI service timed out. Please try again.",
                        ex
                );
            }
            // Every other SDK failure (HTTP 4xx/5xx from Gemini, parse
            // errors, malformed responses) surfaces as UPSTREAM_ERROR. The
            // handler NEVER includes the cause's message in the response
            // body — only the user-safe message above. The cause is logged
            // server-side with the request ID for debugging.
            throw new UpstreamException(
                    "AI service is temporarily unavailable. Please try again.",
                    ex
            );
        }

        // Three-path safety check — translated verbatim from the frontend.
        // NOTE: response.promptFeedback() already returns Optional<...> per the
        // google-genai 1.51.0 SDK, so we call flatMap directly rather than
        // re-wrapping with Optional.ofNullable (which would produce
        // Optional<Optional<...>> and break .flatMap resolution).
        response.promptFeedback()
                .flatMap(pf -> pf.blockReason())
                .ifPresent(reason -> {
                    throw new SafetyBlockException(
                            "Gemini blocked the prompt: " + reason
                    );
                });

        Optional<Candidate> firstCandidate = response.candidates()
                .flatMap(list -> list.isEmpty() ? Optional.empty() : Optional.of(list.get(0)));

        Optional<FinishReason> finishReason = firstCandidate
                .flatMap(Candidate::finishReason);

        // Compare against the FinishReason.Known enum directly rather than
        // matching on FinishReason.toString(). google-genai 1.51.0's toString
        // happens to produce "SAFETY" / "PROHIBITED_CONTENT" today (see D2a),
        // but that is incidental — a future SDK version could change the
        // wrapper's toString format (e.g. "Known[SAFETY]") and silently break
        // output-level safety detection. The Known enum constants are a
        // stable API surface. Mirrors the input-side pattern from D2a.
        if (finishReason.isPresent()) {
            FinishReason.Known reason = finishReason.get().knownEnum();
            if (reason == FinishReason.Known.SAFETY
                    || reason == FinishReason.Known.PROHIBITED_CONTENT) {
                throw new SafetyBlockException(
                        "Gemini blocked the response: finishReason=" + reason
                );
            }
        }

        String content = response.text();
        if (content == null || content.isBlank()) {
            throw new SafetyBlockException(
                    "Gemini returned an empty response (likely a silent safety block)."
            );
        }

        return new GeminiResponseDto(content.trim(), MODEL_ID);
    }

    /**
     * Package-private seam for the SDK call. Exists so
     * {@code GeminiServiceTest} can stub the upstream boundary with
     * {@code spy() + doReturn()} without having to reflectively overwrite
     * {@code Client.models} — that field is declared {@code public final}
     * in google-genai 1.51.0 and JDK 21+ blocks {@code Field.set} on final
     * fields. The production call site delegates to this method; the only
     * behavioral difference is one extra stack frame.
     */
    GenerateContentResponse callModels(String modelId, String userPrompt, GenerateContentConfig config) {
        return client.models.generateContent(modelId, userPrompt, config);
    }

    /**
     * Walk the exception cause chain looking for a TimeoutException. The
     * google-genai SDK wraps HTTP-layer exceptions inside its own types,
     * so a direct {@code ex instanceof TimeoutException} check misses
     * real timeouts.
     */
    private static boolean isTimeout(Throwable ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            if (cursor instanceof TimeoutException) return true;
            // google-genai currently surfaces SDK-level timeouts with a
            // message containing "timeout" — defensive fallback.
            String msg = cursor.getMessage();
            if (msg != null && msg.toLowerCase().contains("timeout")) return true;
            if (cursor.getCause() == cursor) return false; // self-referential guard
            cursor = cursor.getCause();
        }
        return false;
    }
}
