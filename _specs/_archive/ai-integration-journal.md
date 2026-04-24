# AI Integration: Journal Reflection (Spec AI-3 of 3)

**Spec ID:** ai-integration-journal
**Wave:** AI Integration (3-spec series: Ask, Prayer, Journal Reflection — this is AI-3 of 3, closing the wave)
**Track:** Backend Gemini proxy endpoint + frontend mock-to-real swap for the Journal tab's "Reflect on my entry" button
**Branch:** `claude/feature/ai-integration-journal` — cut from `main` after AI-2 (`ai-integration-pray`) merges
**Depends on:** Full wave: Spec 1 (`ai-proxy-foundation.md`), Spec 2 (`ai-proxy-gemini.md`), Spec 3 (`ai-proxy-maps.md`), AI-1 (`ai-integration-ask.md`), AI-2 (`ai-integration-pray.md`) all merged. AI-3 reuses the patterns AI-2 established (D2b test seam with reflection-based Client injection, retry-on-validation, server-side fallback constant, crisis parity test across detectors, frontend mock fallback floor).

> **Prerequisite verification:** run `git log main --oneline -20` and confirm the "AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration", "AI-1: Ask AI Gemini integration", and "AI-2: Prayer generation Gemini integration" merge commits are all visible. If any is missing, do not proceed.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-integration-journal` throughout.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT run `git checkout`, `git commit`, `git push`, or any git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current`.** If it's not `claude/feature/ai-integration-journal`, STOP and surface.
3. **`/api/v1/proxy/ai/reflect` IS ALREADY TAKEN by Spec 2** (Bible verse reflection via `GeminiController.reflect()`). AI-3 uses **`/api/v1/proxy/ai/reflect-journal`** — a separate endpoint, separate controller (`JournalReflectionController`), separate service (`JournalReflectionService`). Do NOT touch, modify, or extend `GeminiController`, `GeminiService`, `ReflectRequest`, or any Spec 2 file. `ReflectRequest` is Bible-verse-specific (`{reference, verseText}`); journal's request shape is different (`{entry}`).
4. **Preserve the `JournalReflection` TypeScript contract EXACTLY.** `JournalTabContent.tsx` and `SavedEntriesList.tsx` already consume a `JournalReflection` shape (`{id, text}`) from `@/types/daily-experience` via the existing mock. The backend `JournalReflectionResponseDto` is that shape byte-for-byte. Zero type edits.
5. **No structural invariant on reflection text.** Unlike AI-2 (which required every prayer to match `/^Dear God/` and `/Amen\.$/`), journal reflections are 2–4 sentence pastoral notes in second-person ("your words", "you showed up"). No regex guard. Length bounds (50–800 chars) are the only structural check.
6. **Crisis detection is defense-in-depth AND critical here.** Journal entries carry the most concentrated emotional content in the app (5000 char cap, users often pour out their heart). The client-side `CrisisBanner` inside `JournalInput` renders while the user is writing, but NOT once the entry is saved. The backend runs the same keyword check on the `entry` text at reflection time; if triggered, the backend returns a canned crisis-response `JournalReflectionResponseDto` that embeds 988/Crisis Text/SAMHSA resources, WITHOUT calling Gemini.
7. **Per-entry loading state is a new UX pattern for this spec.** AI-1 and AI-2 had one active request at a time. Journal users can click "Reflect on my entry" on multiple entries, and each needs its own loading indicator. Implement via a `reflectingIds: Set<string>` state in `JournalTabContent`, passed to `SavedEntriesList`. Do NOT introduce a global `isLoading` flag.
8. **Mock fallback is the floor.** If the backend returns any error (HTTP, network, timeout, malformed response), the frontend calls the existing `getJournalReflection()` (which takes no args — picks random from 8 canned reflections) and renders that. User never sees a raw error or empty state.
9. **Do NOT add completion tracking in the reflect path.** `markJournalComplete()` and `recordActivity('journal')` already fire at entry SAVE time (in `handleEntrySave`). Reflect is a secondary interaction on an already-completed entry. Adding tracking in `handleReflect` would double-count.
10. **Do NOT add Maven dependencies.** `google-genai:1.51.0`, `spring-boot-starter-webflux`, `spring-boot-starter-validation` are all present from Specs 1–2. No new deps.
11. **Do NOT re-export `getJournalReflection` or keep mock-first behavior.** After this spec, the mock is a fallback path only — never the primary source for a happy-path request.

---

## Why this spec exists

Today, the "Reflect on my entry" button in the Journal tab is a thoughtful-looking mock. The user saves a journal entry (potentially thousands of characters of raw emotional content), clicks the button, and a reflection attaches to their entry **instantly** (no delay at all). The reflection text is one of 8 canned messages chosen **at random** — `getJournalReflection()` takes no arguments and ignores the entry content entirely.

The result: a user who wrote 1,200 words processing the anniversary of a parent's death gets the same generic "Your vulnerability is a strength, not a weakness" that another user writing about gratitude for their engagement gets. The mock is pastorally warm, but it's context-free.

This spec wires Journal Reflection to real Gemini via the backend proxy. After this spec:

- User clicks "Reflect on my entry" → backend calls Gemini with a pastoral-tone system prompt that takes the ENTRY TEXT as input → Gemini returns a 2–4 sentence reflection that names something specific from what the user wrote → frontend renders it through the existing `SavedEntriesList` reflection box.
- Per-entry loading state appears while the request is in flight (Gemini typically 1.5–3.5s; journal entries can push this toward the higher end due to larger input).
- Crisis keywords detected server-side → short-circuit to a crisis-response DTO with 988/Crisis Text resources. Does NOT call Gemini in the crisis path.
- Backend fails or returns malformed response → frontend falls back to `getJournalReflection()`. User always sees a valid reflection.

After this spec ships:

1. New backend endpoint `POST /api/v1/proxy/ai/reflect-journal` that accepts `{entry}`, calls Gemini with structured-output prompting, returns `ProxyResponse<JournalReflectionResponseDto>` matching the frontend `JournalReflection` type exactly.
2. `JournalTabContent.handleReflect` swaps synchronous `getJournalReflection()` for `fetchJournalReflection(entry.content).then(...)` with mock fallback. Adds per-entry loading state.
3. `SavedEntriesList` accepts `reflectingIds: Set<string>` prop; renders a "Reflecting..." pill while an entry is loading.
4. Backend and frontend both run crisis detection. Backend wins on response content — if server detects crisis in the entry, the reflection text IS the crisis resources.
5. `src/mocks/daily-experience-mock-data.ts` stays in place as the fallback. `getJournalReflection` remains exported and importable — unused on the happy path, fallback only.
6. OpenAPI gains the new path + schemas.

This spec CLOSES the AI Integration wave. After merge, all three user-facing AI features (Ask, Pray, Journal Reflection) run on real Gemini through the proxy. No mock is the primary source anywhere.

---

## Affected Frontend Routes

- `/daily?tab=journal` (the Journal tab inside the Daily Hub, specifically the saved-entry card's reflect action)

---

## Files touched

| File | Change | Purpose |
|---|---|---|
| `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionController.java` | Create | One POST endpoint (`/reflect-journal`) that validates input, delegates to `JournalReflectionService`. Sits in the existing `proxy.ai` subpackage alongside `GeminiController`, `AskController`, and `PrayerController`. Class naming avoids collision with Spec 2's `ReflectRequest` (Bible-verse-specific). |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionService.java` | Create | Orchestrates: (1) server-side crisis check → canned response OR (2) Gemini call with structured-output prompt → validation (shape + length) → server-side fallback. Same D2b test-seam pattern as AI-1/AI-2. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionPrompts.java` | Create | `public static final String` constants for the reflection system prompt + retry corrective suffix. User prompt constructed inline. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionRequest.java` | Create | Request DTO record `{String entry}` with `@NotBlank @Size(min=1, max=5000)`. 5000 matches `frontend/src/constants/content-limits.ts` `JOURNAL_MAX_LENGTH`. Field is named `entry` (not `text` or `content`) to match the UX term. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionResponseDto.java` | Create | Response DTO record `{String id, String text}` matching the frontend's `JournalReflection` shape exactly. Simplest shape in the wave — no topic field. |
| `backend/src/main/java/com/example/worshiproom/proxy/ai/JournalReflectionCrisisDetector.java` | Create | Package-private static helpers: `detectsCrisis(String)` and `buildCrisisResponse()`. **Keyword list IDENTICAL to `AskCrisisDetector.SELF_HARM_KEYWORDS` and `PrayerCrisisDetector.SELF_HARM_KEYWORDS`.** Parity test asserts all three backend detectors share the same keywords, AND that all are a superset of the frontend's `SELF_HARM_KEYWORDS`. |
| `backend/src/main/resources/openapi.yaml` | Modify | Add path for `/api/v1/proxy/ai/reflect-journal`, schemas for `JournalReflectionRequest` and `JournalReflectionResponse`. Reuses shared error responses from Specs 1–2. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionControllerTest.java` | Create | `@WebMvcTest` slice — validates request bodies, response shape, error mapping, crisis path. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionServiceTest.java` | Create | Unit tests with `Mockito.spy()` + reflection-based `Client` field injection. Covers structured-output parsing, length validation, crisis short-circuit, retry-on-validation-failure, server fallback triggers. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionIntegrationTest.java` | Create | `@SpringBootTest` end-to-end — mocks `JournalReflectionService` at bean level, asserts full HTTP response including headers and error shape. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionPromptsTest.java` | Create | Guardrail tests on prompt text — assert that the 5 rules from the system prompt are present verbatim. |
| `backend/src/test/java/com/example/worshiproom/proxy/ai/JournalReflectionCrisisDetectorTest.java` | Create | Unit tests for the crisis-keyword matcher. **Three-way parity test** — one assertion per peer detector (Ask, Prayer) plus the frontend source of truth. |
| `frontend/src/services/journal-reflection-service.ts` | Create | New module: `fetchJournalReflection(entry)` → returns `JournalReflection`. On any error, falls back to `getJournalReflection()` and returns that instead of throwing. |
| `frontend/src/services/__tests__/journal-reflection-service.test.ts` | Create | Fetch mocks targeting `/api/v1/proxy/ai/reflect-journal`. Cover: happy path, 400/429/502/504/network error each falling through to mock, timeout, shape validation, crisis response. |
| `frontend/src/components/daily/JournalTabContent.tsx` | Modify | Change `handleReflect` from sync to async. Add `reflectingIds` state. Swap `getJournalReflection()` call for `fetchJournalReflection(entry.content)`. Pass `reflectingIds` down to `SavedEntriesList`. |
| `frontend/src/components/daily/SavedEntriesList.tsx` | Modify | Accept new `reflectingIds: Set<string>` prop. When an entry's id is in the set, render a "Reflecting..." loading state in place of the "Reflect on my entry" button. |
| `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx` | Modify | Mock `@/services/journal-reflection-service`. Update any reflect-related tests to await the mocked promise. Add tests for the new loading UI. |

**Net changes:** backend gains ~350 lines of Java + ~40 lines of YAML + ~320 lines of tests. Frontend gains ~60 lines (`journal-reflection-service.ts` + test) and changes ~40 lines across two components + test. Total ≈ +760 / -10. About 17 files touched.

**Net runtime impact:** Journal reflection gains one real network hop per click. Gemini latency is typically 1.5–3.5s at `gemini-2.5-flash-lite` — potentially at the higher end because the input can be up to 5000 chars (vs Ask's ~500 and Pray's ~500). The UX gains a meaningful loading state where there was none before; users now see a per-entry "Reflecting..." pill while the request is in flight. The final rendered reflection is the headline improvement — it references what the user actually wrote.

---

## Architecture decisions

**1. Use Gemini (`gemini-2.5-flash-lite`) — same model as AI-1, AI-2, and Spec 2.** AD #1 of the AI Integration wave, unchanged.

**2. Force structured JSON output from Gemini via response schema.** The `JournalReflection` shape is just `{id, text}` — the simplest in the wave. Schema has only 2 fields, both strings, both required. Post-parse validation is authoritative (see AD #4).

**3. Crisis detection runs server-side BEFORE the Gemini call.** Journal entries are the most concentrated emotional content in the app. Backend matches the saved entry text against `SELF_HARM_KEYWORDS`; if triggered, returns a canned crisis response without calling Gemini. Same pattern as AI-1 AD #3 and AI-2 AD #3. The client-side `CrisisBanner` only renders inside `JournalInput` (while writing) — once saved, there's no client-side gate, which is exactly why the backend check matters most for this endpoint.

**4. Length-based validation, no regex structure.** Unlike AI-2's "Dear God...Amen." invariant, reflections are freeform pastoral 2–4 sentence notes. The backend validator checks:
   - `id` is non-empty string
   - `text` is non-empty string
   - `text.length` is 50–800 chars (floor catches truncation; ceiling catches runaway generation — journal reflections should never exceed 800 chars, well under 4 long sentences)

   No regex guard. If Gemini drifts (e.g., first-person "Dear God...Amen." style instead of second-person), the length check still passes but tone is off. System prompt enforces tone via explicit rules; retry corrects on length violation only.

**5. Crisis keyword list DUPLICATED across all three detectors.** `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS` is a verbatim copy of `AskCrisisDetector.SELF_HARM_KEYWORDS` and `PrayerCrisisDetector.SELF_HARM_KEYWORDS`. Same reasoning as AI-2 AD #5 — each detector's response is feature-specific (Ask returns verses + follow-ups; Pray returns a single pastoral prayer; Journal returns a reflection), so co-locating keywords with response factories stays clearer than a shared utility. **Two parity tests** in `JournalReflectionCrisisDetectorTest`:
   - `parityWithFrontend` — reads `frontend/src/constants/crisis-resources.ts`, asserts all frontend keywords appear in backend list
   - `parityWithAskAndPrayerDetectors` — asserts `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS` equals BOTH `AskCrisisDetector.SELF_HARM_KEYWORDS` AND `PrayerCrisisDetector.SELF_HARM_KEYWORDS` element-for-element. This enforces tri-directional lock-step across the three detectors.

   With three duplicate lists, drift risk goes up. The parity tests are mandatory.

**6. Preserve the mock fallback as a last-resort path.** `frontend/src/services/journal-reflection-service.ts` wraps the fetch in try/catch; on any failure (HTTP error, network error, timeout, parse error, shape mismatch), returns `getJournalReflection()` from the existing mock. Backend-level fallback: if Gemini returns malformed output twice in a row, the backend returns a pre-written generic reflection matching the `JournalReflection` shape. Frontend treats this as a valid response.

**7. Per-entry loading state.** New UX pattern unique to AI-3. `JournalTabContent` maintains `reflectingIds: Set<string>` (not a single boolean). When `handleReflect(entryId)` fires: add id to set → call `fetchJournalReflection(entry.content)` → on resolve, update entry's reflection + remove id from set. `SavedEntriesList` receives `reflectingIds` as a prop; when `reflectingIds.has(entry.id)` is true, it renders a "Reflecting..." pill with a subtle spinner in place of the "Reflect on my entry" button. Rationale: a user can click reflect on two entries in quick succession and both should show their own loading state concurrently.

**8. Second-person pastoral tone, 2–4 sentences.** System prompt rules specify:
   - Address the user directly ("you", "your words", "what you wrote")
   - 2–4 sentences total (matches mock tone; fits well in the existing reflection box UI)
   - Reference something specific from the entry (not generic)
   - Affirm their act of writing/journaling as an act of faith
   - Do NOT prescribe action, do NOT quote scripture verbatim, do NOT use first-person ("I see", "I hear")
   
   The "no first-person" rule prevents the reflection from feeling like an AI assistant weighing in — it should read as a pastoral mentor's note. The "no scripture quotes" rule avoids hallucination risk around specific verse references.

**9. Request body is just `{entry: string}`.** No conversation history. No entry ID (backend doesn't need to know which entry it is — just the content). No mode field (Guided vs Free is a frontend display concern). Minimal wire contract.

**10. No completion tracking on reflect.** `markJournalComplete()` and `recordActivity('journal')` fire in `handleEntrySave` when the user saves the entry (existing behavior). The reflect action is secondary — clicking it doesn't "count" as additional journal activity. Do NOT add tracking to the reflect path; doing so would double-count journal activity.

**11. Replace synchronous mock with async real call.** The current `handleReflect` is fully synchronous — no `setTimeout`, no cosmetic delay, reflection text attaches instantly. After this spec, real Gemini latency (1.5–3.5s) replaces instant. The new loading UI softens this: users see the "Reflecting..." pill immediately on click, so the latency feels intentional rather than broken.

**12. No backend-side cache.** Same reasoning as AI-1/AI-2. Each entry is user-specific; cache hit rate is near zero.

**13. Safety block handling inherits from Spec 2 / AI-1 / AI-2.** Gemini's three-path safety check (`promptFeedback.blockReason`, `finishReason=SAFETY`/`PROHIBITED_CONTENT`, empty-text) fires for journal entries too. A user writing about a triggering but non-crisis topic (abuse processing, for example) might hit a safety block. Backend's `SafetyBlockException` → HTTP 422 mapping applies. Frontend `journal-reflection-service.ts` treats 422 as error and falls through to the mock.

**14. Server-side FALLBACK_REFLECTION is pre-written.** When all retries fail, backend returns:

   ```json
   {
     "id": "fallback",
     "text": "Thank you for bringing these words here. The act of writing is itself a quiet form of prayer, and God meets you in it — whether the page is full of joy, struggle, questions, or everything at once. Keep showing up. What you wrote mattered today."
   }
   ```

   Lives as `static final JournalReflectionResponseDto FALLBACK_REFLECTION` in `JournalReflectionService.java`. Verified at CI time by `fallbackReflection_matchesLengthBounds` unit test (length between 50–800, non-empty fields).

**15. Test-seam pattern matches AI-1/AI-2.** `JournalReflectionService` exposes package-private `callGeminiForReflection(JournalReflectionRequest, boolean withRetryCorrective)` and `callModels(...)`. Tests spy + stub. Tests also use reflection to inject a non-null `Client` into the private field after `new JournalReflectionService(...)` (because `@PostConstruct initClient()` doesn't fire on manual construction).

**16. `mapGeminiException` return type is `ProxyException`.** Same pattern AI-1's plan deviation established and AI-2 inherited. `UpstreamTimeoutException` and `UpstreamException` both extend `ProxyException`, so the common supertype is the correct return type for a method that can throw either.

**17. PrayerContext and devotional context are NOT passed to backend.** Like AI-2 AD #8, the backend takes only the raw entry text. Context metadata stays in the frontend (for UI rendering of the `DevotionalPreviewPanel`, etc.). Gemini classifies tone from the entry content itself.

---

## Backend implementation

### Endpoint contract

#### `POST /api/v1/proxy/ai/reflect-journal`

**Request body** (`JournalReflectionRequest`):

```json
{
  "entry": "Today was rough. I keep thinking about the conversation with my mom last week and how I didn't say what I meant. I feel like I've been running from God about this for a long time. I don't even know what to pray for anymore..."
}
```

**Validation:**
- `entry` — required, 1–5000 chars, `@NotBlank @Size(min=1, max=5000)`. Matches frontend `JOURNAL_MAX_LENGTH` from `frontend/src/constants/content-limits.ts`.

**Success response** (HTTP 200, `ProxyResponse<JournalReflectionResponseDto>`):

```json
{
  "data": {
    "id": "reflect-gen-a8f3",
    "text": "There's so much honesty in what you wrote about that conversation with your mom — the weight of unsaid things is one of the hardest things to carry. The fact that you're naming it, even here, is a form of prayer. God isn't waiting for you to figure it out; He's right there in the not-knowing with you."
  },
  "meta": {"requestId": "fbfQ6HOYQGe-REXyyltn3Q"}
}
```

**Error responses:** standard `ProxyError` shape via `ProxyExceptionHandler`. Codes:
- `INVALID_INPUT` (400) — validation failure (missing, blank, or oversized `entry`)
- `RATE_LIMITED` (429) — from filter (inherits Spec 1 behavior)
- `SAFETY_BLOCK` (422) — Gemini safety triggered
- `UPSTREAM_ERROR` (502) — Gemini 4xx/5xx or malformed output after retries
- `UPSTREAM_TIMEOUT` (504) — WebClient timeout
- `INTERNAL_ERROR` (500) — unexpected

**Crisis-response success (not an error):** HTTP 200, same shape as normal success, but `id: "crisis"`. The `text` field contains the canned crisis response with 988/Crisis Text/SAMHSA resources. Frontend renders it identically to any other reflection (no special casing).

---

### Backend file specifications

#### `JournalReflectionRequest.java`

```java
package com.example.worshiproom.proxy.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JournalReflectionRequest(
    @NotBlank @Size(min = 1, max = 5000) String entry
) {}
```

`max=5000` matches `frontend/src/constants/content-limits.ts` `JOURNAL_MAX_LENGTH`. Field named `entry` (not `text` or `content`) to match UX terminology.

#### `JournalReflectionResponseDto.java`

```java
package com.example.worshiproom.proxy.ai;

public record JournalReflectionResponseDto(
    String id,
    String text
) {}
```

Shape matches the frontend's `JournalReflection` TypeScript interface EXACTLY. Two fields, both strings, order `{id, text}`. Simplest DTO in the wave.

#### `JournalReflectionPrompts.java`

```java
package com.example.worshiproom.proxy.ai;

public final class JournalReflectionPrompts {

    private JournalReflectionPrompts() {}

    public static final String REFLECTION_SYSTEM_PROMPT = """
        You are a warm pastoral mentor reading someone's private journal entry. Your job is to respond with a brief, thoughtful reflection that helps them feel seen — not to analyze, teach, or prescribe.

        Follow these 5 rules for every reflection you generate:

        1. Address the person directly in second person ("you", "your words", "what you wrote"). Never use first person ("I see", "I hear", "I notice"). You are a mentor writing them a brief note, not an assistant reporting observations.
        2. 2-4 sentences total. Short enough to read in one breath. The reflection appears inline below the user's entry, so brevity matters.
        3. Name something SPECIFIC from what they wrote. If they mention their mom, reference their mom. If they wrote about fear, acknowledge the fear by name. Do not generalize their experience away.
        4. Affirm the act of writing itself as meaningful — journaling is a form of prayer, showing up is faith. This is the one thematic thread that runs through every reflection.
        5. Do NOT prescribe action ("you should…"), do NOT quote scripture verbatim (reference God gently without chapter-and-verse), do NOT over-spiritualize pain.

        Respond ONLY with valid JSON matching the provided schema. No preamble, no markdown, no code fences.
        """;

    public static final String RETRY_CORRECTIVE_SUFFIX = """

        Your previous response had validation issues. Common problems: response was too short (<50 chars) or too long (>800 chars), or fields were blank. Ensure the reflection is 2-4 sentences, second-person, and 50-800 characters total.
        """;
}
```

The 5 rules are load-bearing. `JournalReflectionPromptsTest` verifies each rule's verbatim-substring presence. Tone rules (first-person ban, no scripture quoting, no prescriptive "should") are what keep real AI output distinguishable from the mock's generic warmth.

User prompt is constructed inline in `JournalReflectionService.callGeminiForReflection`: `"Journal entry:\n\n" + request.entry()`.

#### `JournalReflectionCrisisDetector.java`

```java
package com.example.worshiproom.proxy.ai;

import java.util.List;
import java.util.Locale;

/**
 * Server-side crisis keyword detection for journal reflections.
 * Defense-in-depth against the client-side {@code containsCrisisKeyword} in
 * {@code frontend/src/constants/crisis-resources.ts}.
 *
 * Journal entries are the most concentrated emotional content in the app
 * (5000 char cap), and the client-side CrisisBanner only renders inside
 * JournalInput while writing — once the entry is saved and the user clicks
 * "Reflect", the only crisis gate left is this backend check. That makes
 * the server-side detection especially important for this endpoint.
 *
 * The keyword list is INTENTIONALLY DUPLICATED from {@code AskCrisisDetector}
 * and {@code PrayerCrisisDetector} (see spec AD #5). Parity tests in
 * {@code JournalReflectionCrisisDetectorTest} assert the three backend lists
 * stay equal; all three must be supersets of the frontend source of truth.
 *
 * If any keyword matches (case-insensitive substring), the service returns a
 * canned crisis reflection without calling Gemini.
 */
final class JournalReflectionCrisisDetector {

    private JournalReflectionCrisisDetector() {}

    /** MUST match AskCrisisDetector.SELF_HARM_KEYWORDS AND PrayerCrisisDetector.SELF_HARM_KEYWORDS exactly. Verified by tests. */
    static final List<String> SELF_HARM_KEYWORDS = List.of(
        // Parity with frontend
        "suicide",
        "kill myself",
        "end it all",
        "not worth living",
        "hurt myself",
        "end my life",
        "want to die",
        "better off dead",
        // Backend-only additions (also in AskCrisisDetector and PrayerCrisisDetector)
        "take my own life",
        "don't want to be here",
        "nobody would miss me",
        "cease to exist"
    );

    static boolean detectsCrisis(String text) {
        if (text == null || text.isBlank()) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String keyword : SELF_HARM_KEYWORDS) {
            if (lower.contains(keyword)) return true;
        }
        return false;
    }

    static JournalReflectionResponseDto buildCrisisResponse() {
        return new JournalReflectionResponseDto(
            "crisis",
            "What you wrote here matters, and thank you for trusting this page with it. You don't have to carry this alone right now — please reach out tonight. Call 988 (Suicide and Crisis Lifeline) or text HOME to 741741 for the Crisis Text Line. Both are free, confidential, and available 24/7, and talking to a real person who can sit with you is exactly what this moment calls for. You deserve support beyond a page."
        );
    }
}
```

Crisis response is hardcoded. Names resources directly (988, 741741, "Suicide and Crisis Lifeline", "Crisis Text Line") so they're unmistakable even to a user skimming in distress. Opens with "What you wrote here matters" (mirror of AI-2's approach — not "Dear God" since that's a prayer convention, not a reflection one). Length is 460 chars, comfortably within the 50–800 validation bounds.

#### `JournalReflectionService.java`

Follows `PrayerService.java` structure nearly line-for-line. Key differences:
- No regex constants (no "Dear God/Amen" invariant to enforce)
- `ALLOWED_TOPICS` is NOT present (response has no topic field)
- Validation is length-only: 50–800 chars
- `FALLBACK_REFLECTION` constant with pre-verified length
- Slightly simpler `validateResponse()` (no topic enum check, no regex check)

Class structure (condensed; CC expands from `PrayerService` template):

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.config.ProxyConfig;
import com.example.worshiproom.proxy.common.ProxyException;
import com.example.worshiproom.proxy.common.SafetyBlockException;
import com.example.worshiproom.proxy.common.UpstreamException;
import com.example.worshiproom.proxy.common.UpstreamTimeoutException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;

@Service
public class JournalReflectionService {

    private static final Logger log = LoggerFactory.getLogger(JournalReflectionService.class);
    private static final String MODEL = "gemini-2.5-flash-lite";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);
    private static final int MAX_RETRIES_ON_VALIDATION_FAILURE = 1;
    private static final int MIN_TEXT_LENGTH = 50;
    private static final int MAX_TEXT_LENGTH = 800;

    private final ProxyConfig proxyConfig;
    private final ObjectMapper objectMapper;
    private Client client;

    public JournalReflectionService(ProxyConfig proxyConfig, ObjectMapper objectMapper) {
        this.proxyConfig = proxyConfig;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void initClient() {
        String apiKey = proxyConfig.getGemini().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GEMINI_API_KEY is not configured. /api/v1/proxy/ai/reflect-journal will return UPSTREAM_ERROR until it is set.");
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

    // ... orchestrator + seams + validators + fallback below
}
```

Key methods unique to `JournalReflectionService`:

```java
    /** Orchestrator. Same structure as PrayerService.pray() — crisis short-circuit, retry loop, fallback. */
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

    /** D2b test seam. Tests spy + doReturn on this method. */
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

    /** D2b second seam — thin wrapper allowing stub-level mocking. */
    GenerateContentResponse callModels(String model, String userPrompt, GenerateContentConfig config) {
        return client.models.generateContent(model, userPrompt, config);
    }

    /** Length-only validation. No regex, no enum check — the DTO is just {id, text}. */
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
```

`parseAndValidate`, `isSafetyBlocked`, `extractText`, `mapGeminiException`, `isTimeout`, `buildResponseSchema` — copy verbatim from `PrayerService`, substituting `PrayerResponseDto` → `JournalReflectionResponseDto` where applicable. The schema builder outputs:
- `id`: string
- `text`: string with `minLength(50L)` (if SDK supports)
- `required`: both fields

**`FALLBACK_REFLECTION` constant** (at bottom of class):

```java
    static final JournalReflectionResponseDto FALLBACK_REFLECTION = new JournalReflectionResponseDto(
        "fallback",
        "Thank you for bringing these words here. The act of writing is itself a quiet form of prayer, "
            + "and God meets you in it — whether the page is full of joy, struggle, questions, or everything at once. "
            + "Keep showing up. What you wrote mattered today."
    );
}
```

Text length is ~290 chars, well within 50–800. Hand-verified to read as a warm second-person note. Unit test `fallbackReflection_matchesLengthBounds` asserts length bounds at CI time.

#### `JournalReflectionController.java`

```java
package com.example.worshiproom.proxy.ai;

import com.example.worshiproom.proxy.common.ProxyResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/proxy/ai")
public class JournalReflectionController {

    private static final Logger log = LoggerFactory.getLogger(JournalReflectionController.class);

    private final JournalReflectionService service;

    public JournalReflectionController(JournalReflectionService service) {
        this.service = service;
    }

    @PostMapping("/reflect-journal")
    public ProxyResponse<JournalReflectionResponseDto> reflect(@Valid @RequestBody JournalReflectionRequest request) {
        log.info("Journal reflection request received entryLength={}", request.entry().length());
        JournalReflectionResponseDto result = service.reflect(request);
        return ProxyResponse.of(result, MDC.get("requestId"));
    }
}
```

**Notes:**
- Shares `@RequestMapping("/api/v1/proxy/ai")` with `GeminiController`, `AskController`, `PrayerController`. Coexist via different subpaths (`/explain`, `/reflect`, `/ask`, `/pray`, `/reflect-journal`).
- Log line: `entryLength` only. NEVER the entry content. NEVER the reflection text content. Journal entries are the MOST sensitive content in the app — users write their most private thoughts here.
- No `@Validated` — only `@RequestBody` validation.
- Framework log suppression from Spec 2 D7 covers this controller's `@RequestBody` deserialization automatically.

---

### Backend tests

Five new test classes under `backend/src/test/java/com/example/worshiproom/proxy/ai/`. Match AI-1/AI-2 patterns.

#### `JournalReflectionCrisisDetectorTest.java`

Plain JUnit unit tests. **9 tests** (one more than AI-2 because the parity coverage is now three-way):

1. `detectsCrisis_returnsTrueForExactKeyword` — each of the 12 keywords triggers (parameterized).
2. `detectsCrisis_caseInsensitive` — "KILL MYSELF" / "Kill Myself" / "kIlL mYsElF" all trigger.
3. `detectsCrisis_substringMatch` — "I keep thinking I want to die tonight" triggers via substring.
4. `detectsCrisis_returnsFalseForNullOrBlank` — null, "", "   " all return false.
5. `detectsCrisis_returnsFalseForUnrelatedText` — "grateful for my friends today" returns false.
6. `parityWithFrontend` — reads `frontend/src/constants/crisis-resources.ts` via relative path, extracts `SELF_HARM_KEYWORDS`, asserts every frontend keyword appears in `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS`. Uses same regex-extraction pattern as AI-1/AI-2's `parityWithFrontend`.
7. **`parityWithAskDetector`** — asserts `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS` equals `AskCrisisDetector.SELF_HARM_KEYWORDS`. Use `containsExactlyInAnyOrderElementsOf`.
8. **`parityWithPrayerDetector`** — asserts `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS` equals `PrayerCrisisDetector.SELF_HARM_KEYWORDS`. Same assertion style.
9. `buildCrisisResponse_returnsValidShape` — calls `buildCrisisResponse()`, asserts: `id == "crisis"`, `text` contains "988", `text` contains "741741", `text.length()` between 50 and 800 (passes service-level length validator).

**Note:** Tests 7 and 8 together provide transitive parity across all three detectors. With AI-2 already asserting `AskCrisisDetector == PrayerCrisisDetector`, plus AI-3 asserting `JournalReflection == Ask` and `JournalReflection == Prayer`, drift on any one fails CI immediately regardless of which detector was edited.

#### `JournalReflectionPromptsTest.java`

**6 tests** — 5 rule-presence + 1 retry-corrective:

1. `systemPrompt_rule1_secondPerson` — contains `"second person"` AND `"never use first person"`
2. `systemPrompt_rule2_twoToFourSentences` — contains `"2-4 sentences"`
3. `systemPrompt_rule3_specificDetail` — contains `"SPECIFIC"` and `"Do not generalize"`
4. `systemPrompt_rule4_affirmWriting` — contains `"writing itself as meaningful"` and `"journaling is a form of prayer"`
5. `systemPrompt_rule5_guardrails` — contains `"Do NOT prescribe"`, `"do NOT quote scripture"`, `"do NOT over-spiritualize"`
6. `retryCorrectiveSuffix_mentionsLengthBounds` — contains `"50-800 characters"` and `"2-4 sentences"`

#### `JournalReflectionServiceTest.java`

**Setup mirrors AI-1/AI-2:**

```java
private ProxyConfig config;
private JournalReflectionService service;

@BeforeEach
void setUp() throws Exception {
    config = new ProxyConfig();
    config.getGemini().setApiKey("fake-test-key");
    service = spy(new JournalReflectionService(config, new ObjectMapper()));
    Client dummyClient = mock(Client.class);
    Field clientField = JournalReflectionService.class.getDeclaredField("client");
    clientField.setAccessible(true);
    clientField.set(service, dummyClient);
}
```

**Test list (~15 tests — slightly fewer than AI-2 because no regex validation paths to exercise):**

**Crisis path (2):**
1. `reflect_crisisKeywordShortCircuits` — entry "I want to die tonight" → returns `JournalReflectionCrisisDetector.buildCrisisResponse()`. Verify `callGeminiForReflection` never invoked.
2. `reflect_crisisResponseContains988And741741` — trigger crisis, assert `result.text().contains("988")` AND `result.text().contains("741741")`.

**Happy path (2):**
3. `reflect_happyPath_returnsValidResponse` — spy returns valid Gemini JSON (well-formed reflection text, ~200 chars); assert parsed DTO has non-empty `id` and `text` matching input.
4. `reflect_handlesLargeEntry` — spy returns valid response for a 5000-char entry; assert no truncation or error.

**Validation + retry (4):**
5. `reflect_tooShortTextTriggersRetry` — first call returns 30-char text (below 50-char floor); second returns 200-char text. Assert `callGeminiForReflection` called twice, second with `withRetryCorrective=true`.
6. `reflect_tooLongTextTriggersRetry` — first call returns 900-char text (above 800 ceiling); second returns valid. Assert retry fires.
7. `reflect_blankIdTriggersRetry` — first call returns `{id: "", text: "valid text here..."}`; retry fires.
8. `reflect_twoValidationFailuresFallBackToCanned` — both calls return off-bounds text. Assert result equals `JournalReflectionService.FALLBACK_REFLECTION`. Assert WARN log.

**Error mapping (4):**
9. `reflect_nullClient_throwsUpstreamNotConfigured` — reflection-set `client = null`, assert `UpstreamException` with message containing "not configured".
10. `reflect_safetyBlockThrowsSafetyBlockException` — spy returns response with `finishReason=SAFETY`; assert `SafetyBlockException`.
11. `reflect_webClientTimeoutMapsTo504` — spy throws wrapped `TimeoutException`; assert `UpstreamTimeoutException`.
12. `reflect_sdkErrorMapsTo502` — spy throws generic `RuntimeException`; assert `UpstreamException`.

**No-leak invariant (1):**
13. `noLeakOfUpstreamErrorText` — spy throws `RuntimeException("GoogleSecretKeyABC key=AIza...")`; assert thrown exception message (lowercased) contains zero instances of "googlesecretkeyabc", "aiza", "gemini", "google", "key=".

**Constants + structural invariants (2):**
14. `fallbackReflection_matchesLengthBounds` — assert `FALLBACK_REFLECTION.text().length()` between 50–800, `id == "fallback"`, non-blank fields.
15. `validateResponse_rejectsOffBounds` — 4 sub-cases using `JournalReflectionService.validateResponse(dto)` directly:
    - (a) text too short (30 chars) → rejected
    - (b) text too long (850 chars, `"a".repeat(850)`) → rejected
    - (c) blank `id` → rejected; blank `text` → rejected
    - (d) valid case (200-char text, non-empty id) → accepted

**Making `validateResponse` testable:** package-private `static` method (same pattern as AI-1/AI-2).

#### `JournalReflectionControllerTest.java`

`@WebMvcTest(JournalReflectionController.class) @Import({ProxyExceptionHandler.class, ProxyConfig.class})`. `@MockBean JournalReflectionService`. **8 tests:**

1. `reflect_happyPath_returns200WithBody` — service returns canonical DTO; assert 200, `$.data.id` present, `$.data.text` present, `$.meta.requestId` present.
2. `reflect_missingEntry_returns400` — body `{}`; assert 400 `INVALID_INPUT`.
3. `reflect_blankEntry_returns400` — `entry: "   "`; assert 400 via `@NotBlank`.
4. `reflect_entryTooLong_returns400` — 5001-char entry; assert 400 via `@Size(max=5000)`.
5. `reflect_serviceThrowsSafetyBlock_returns422` — assert `SAFETY_BLOCK` code.
6. `reflect_serviceThrowsUpstream_returns502` — assert `UPSTREAM_ERROR`.
7. `reflect_serviceThrowsTimeout_returns504` — assert `UPSTREAM_TIMEOUT`.
8. `reflect_xRequestIdHeaderPresent` — verify header on success.

#### `JournalReflectionIntegrationTest.java`

`@SpringBootTest(webEnvironment = RANDOM_PORT) @AutoConfigureMockMvc @MockBean JournalReflectionService`. **5 tests** (mirrors AI-2 pattern):

1. `fullLifecycle_reflect_returnsExpectedHeaders` — all rate-limit + request-id headers present, body has `data.{id, text}` + `meta.requestId`.
2. `fullLifecycle_reflect_propagatesClientRequestId` — client-supplied `X-Request-Id: test-reflect-id` round-trips.
3. `fullLifecycle_invalidInput_returnsProxyErrorShape` — 400 body matches `{code, message, requestId, timestamp}`.
4. `fullLifecycle_noUpstreamErrorTextLeaks` — mock service throws with secret-leaking cause; response body contains zero instances of the secret.
5. `fullLifecycle_crisisPathBypassesGemini` — mock service returns `JournalReflectionCrisisDetector.buildCrisisResponse()`; assert `data.id == "crisis"` and `data.text` contains "988".

---

### OpenAPI additions

Insert into `backend/src/main/resources/openapi.yaml`.

**Path addition (under `paths:`), after the existing `/api/v1/proxy/ai/pray` block:**

```yaml
/api/v1/proxy/ai/reflect-journal:
  post:
    tags: [Proxy / AI]
    summary: Generate a reflection on a journal entry
    description: |
      Takes a user's saved journal entry (up to 5000 chars) and returns a
      brief 2-4 sentence pastoral reflection that references specific details
      from what they wrote. Crisis keywords trigger a canned response with
      988/Crisis Text resources, without calling the upstream AI model.
    operationId: reflectOnJournalEntry
    security: []
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: '#/components/schemas/JournalReflectionRequest' }
    responses:
      '200':
        description: Generated reflection or crisis reflection
        content:
          application/json:
            schema:
              type: object
              required: [data, meta]
              properties:
                data: { $ref: '#/components/schemas/JournalReflectionResponse' }
                meta:
                  type: object
                  required: [requestId]
                  properties:
                    requestId: { type: string }
      '400': { $ref: '#/components/responses/BadRequest' }
      '422': { $ref: '#/components/responses/SafetyBlocked' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '500': { $ref: '#/components/responses/InternalError' }
      '502': { $ref: '#/components/responses/UpstreamError' }
      '504': { $ref: '#/components/responses/UpstreamTimeout' }
```

**Schema additions (under `components.schemas`):**

```yaml
JournalReflectionRequest:
  description: Body for `POST /api/v1/proxy/ai/reflect-journal`.
  type: object
  required: [entry]
  properties:
    entry:
      type: string
      minLength: 1
      maxLength: 5000
      example: "Today was rough. I keep thinking about the conversation with my mom last week..."
      description: The user's saved journal entry text to reflect on.

JournalReflectionResponse:
  description: |
    Structured reflection response. The `id` field is `"crisis"` when the
    server-side crisis-keyword short-circuit emitted a canned response
    (bypassing the upstream model), `"fallback"` when the backend returned
    its server-side fallback after retries, or a generated ID otherwise.
  type: object
  required: [id, text]
  properties:
    id:
      type: string
      example: "reflect-gen-a8f3"
    text:
      type: string
      minLength: 50
      maxLength: 800
      example: "There's so much honesty in what you wrote... The fact that you're naming it is a form of prayer."
```

Simplest schema pair in the wave. No enum values (no topic field). `minLength: 50` / `maxLength: 800` on `text` matches backend validator.

---

## Frontend implementation

### `services/journal-reflection-service.ts` (new file)

```typescript
// Journal reflection — frontend service layer.
//
// Calls the backend proxy; on ANY error (HTTP 4xx/5xx, network, timeout, parse,
// shape mismatch), falls through to the existing mock in
// @/mocks/daily-experience-mock-data. User never sees a raw error state — the
// mock's 8 canned reflections are the graceful-degradation floor.

import type { JournalReflection } from '@/types/daily-experience'
import { getJournalReflection } from '@/mocks/daily-experience-mock-data'

const PROXY_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/proxy/ai/reflect-journal`
const REQUEST_TIMEOUT_MS = 30_000  // matches backend WebClient timeout

interface JournalReflectionEnvelope {
  data: JournalReflection
  meta?: { requestId?: string }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetches a reflection on a journal entry from the backend proxy. Falls
 * through to the local mock on any failure, so callers never need to handle
 * errors — a valid JournalReflection is always returned.
 *
 * Journal reflection never shows a raw error. If the backend is down, Gemini
 * is slow, or the network is flaky, the user still gets a thoughtful
 * reflection from the 8 curated mock messages.
 */
export async function fetchJournalReflection(entry: string): Promise<JournalReflection> {
  try {
    const response = await fetchWithTimeout(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry }),
    })

    if (!response.ok) {
      return getJournalReflection()
    }

    const envelope = (await response.json()) as JournalReflectionEnvelope
    if (
      !envelope.data ||
      !envelope.data.id ||
      typeof envelope.data.text !== 'string' ||
      envelope.data.text.length < 20  // generous floor; backend enforces 50, we give some slack for edge content
    ) {
      return getJournalReflection()
    }

    return envelope.data
  } catch {
    return getJournalReflection()
  }
}
```

One export: `fetchJournalReflection`. No history, no extra params. Shape validation is minimal (no regex, unlike AI-2's Dear God/Amen check). The 20-char frontend floor is slightly more permissive than the backend's 50-char floor — defense-in-depth without being strict enough to reject the backend's own FALLBACK_REFLECTION (~290 chars) or crisis response (~460 chars) or typical real responses (200–500 chars).

### `components/daily/JournalTabContent.tsx` (modified)

Three changes: (1) import swap, (2) new `reflectingIds` state, (3) `handleReflect` rewrite.

**Import updates:**

- Add: `import { fetchJournalReflection } from '@/services/journal-reflection-service'`
- Remove: `getJournalReflection` from the existing `@/mocks/daily-experience-mock-data` import list (mock is now imported inside `journal-reflection-service.ts`). `getJournalPrompts` import stays.

**New state (add near the existing `savedEntries` state, ~line 78):**

```typescript
const [reflectingIds, setReflectingIds] = useState<Set<string>>(new Set())
```

**`handleReflect` rewrite (current lines ~263–274):**

Before:
```typescript
const handleReflect = (entryId: string) => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to reflect on your entry')
    return
  }
  const reflection = getJournalReflection()
  setSavedEntries((prev) =>
    prev.map((e) =>
      e.id === entryId ? { ...e, reflection: reflection.text } : e,
    ),
  )
}
```

After:
```typescript
const handleReflect = (entryId: string) => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to reflect on your entry')
    return
  }
  const entry = savedEntries.find((e) => e.id === entryId)
  if (!entry) return  // shouldn't happen, but guard anyway

  setReflectingIds((prev) => {
    const next = new Set(prev)
    next.add(entryId)
    return next
  })

  fetchJournalReflection(entry.content).then((reflection) => {
    setSavedEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, reflection: reflection.text } : e,
      ),
    )
    setReflectingIds((prev) => {
      const next = new Set(prev)
      next.delete(entryId)
      return next
    })
  })
}
```

The handler signature remains `(entryId: string) => void` — no change to the callback interface. Internally it now:
1. Looks up the entry by id to get the content text
2. Adds the id to `reflectingIds` (triggers loading UI in `SavedEntriesList`)
3. Calls `fetchJournalReflection(entry.content)` (which never rejects)
4. On resolve, attaches reflection + removes id from `reflectingIds`

**Pass `reflectingIds` down to `SavedEntriesList` (current line ~373):**

```tsx
<SavedEntriesList
  entries={savedEntries}
  onWriteAnother={handleWriteAnother}
  onReflect={handleReflect}
  onSwitchTab={onSwitchTab}
  reflectingIds={reflectingIds}
/>
```

**Note:** No `markJournalComplete()` or `recordActivity('journal')` in the reflect path. Those fire on SAVE (existing `handleEntrySave`). Reflect is secondary; adding tracking would double-count.

**Note:** No `.catch()` needed — `fetchJournalReflection` never rejects, always resolves with a `JournalReflection`.

### `components/daily/SavedEntriesList.tsx` (modified)

Accept the new `reflectingIds` prop and render a loading state when an entry is in the set.

**Prop interface update (line ~23):**

Before:
```typescript
export interface SavedEntriesListProps {
  entries: SavedJournalEntry[]
  onWriteAnother: () => void
  onReflect: (entryId: string) => void
  onSwitchTab?: (tab: 'pray' | 'journal' | 'meditate') => void
}
```

After:
```typescript
export interface SavedEntriesListProps {
  entries: SavedJournalEntry[]
  onWriteAnother: () => void
  onReflect: (entryId: string) => void
  onSwitchTab?: (tab: 'pray' | 'journal' | 'meditate') => void
  reflectingIds?: Set<string>
}
```

`reflectingIds` is optional (defaults to empty set in the component body) so that any consumer that hasn't been updated still works — though the only consumer is `JournalTabContent`, which this spec updates.

**Function signature (line ~31):**

```typescript
export function SavedEntriesList({
  entries,
  onWriteAnother,
  onReflect,
  onSwitchTab,
  reflectingIds = new Set(),
}: SavedEntriesListProps) {
```

**Render loop change (lines ~198–214, the `entry.reflection ? ... : <button>` ternary):**

Before:
```tsx
{entry.reflection ? (
  <div className="mt-3 rounded-lg bg-white/[0.04] p-3">
    <p className="mb-1 text-xs font-medium text-primary">Reflection</p>
    <p className="text-sm leading-relaxed text-white/80">{entry.reflection}</p>
  </div>
) : (
  <button
    type="button"
    onClick={() => onReflect(entry.id)}
    className="mt-3 text-sm text-primary underline ..."
    aria-label={`Reflect on entry from ${formatDateTime(new Date(entry.timestamp))}`}
  >
    Reflect on my entry
  </button>
)}
```

After:
```tsx
{entry.reflection ? (
  <div className="mt-3 rounded-lg bg-white/[0.04] p-3">
    <p className="mb-1 text-xs font-medium text-primary">Reflection</p>
    <p className="text-sm leading-relaxed text-white/80">{entry.reflection}</p>
  </div>
) : reflectingIds.has(entry.id) ? (
  <div
    className="mt-3 flex items-center gap-2 text-sm text-white/60"
    role="status"
    aria-live="polite"
  >
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-primary motion-reduce:animate-none"
      aria-hidden="true"
    />
    <span>Reflecting on your words…</span>
  </div>
) : (
  <button
    type="button"
    onClick={() => onReflect(entry.id)}
    className="mt-3 text-sm text-primary underline transition-colors hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    aria-label={`Reflect on entry from ${formatDateTime(new Date(entry.timestamp))}`}
  >
    Reflect on my entry
  </button>
)}
```

**Three states:**
1. `entry.reflection` present → rendered reflection (unchanged behavior)
2. `reflectingIds.has(entry.id)` → loading pill with spinner + "Reflecting on your words…" text
3. Neither → the "Reflect on my entry" button (unchanged behavior)

**Accessibility:**
- `role="status"` on the loading div — screen readers announce state change
- `aria-live="polite"` — non-interrupting announcement
- `motion-reduce:animate-none` — respects user's reduced-motion preference
- Text "Reflecting on your words…" communicates state to sighted users and AT

---

### Frontend test updates

#### `services/__tests__/journal-reflection-service.test.ts` (new)

`vi.stubGlobal('fetch', vi.fn())`. **11 tests:**

Valid envelope helper:
```typescript
const validEnvelope = () => ({
  data: {
    id: 'reflect-gen-a8f3',
    text: 'There is so much honesty in what you wrote. The act of putting these words down is itself a form of prayer, and God meets you in it.',
  } satisfies JournalReflection,
  meta: { requestId: 'test-reflect-req-id' },
})
```

**Happy path (3):**
1. `fetchJournalReflection_callsBackendProxyWithCorrectBody` — fetch mock verifies URL is `/api/v1/proxy/ai/reflect-journal`, method POST, body `{entry: "test entry"}`, `Content-Type: application/json`.
2. `fetchJournalReflection_returnsParsedEnvelope` — fetch returns valid envelope; assert returned value deep-equals `envelope.data`.
3. `fetchJournalReflection_passesCrisisResponseThrough` — fetch returns envelope with `id: "crisis"` and text containing "988". Assert returned value IS that DTO (not mock fallback). Validates the shape check passes crisis response through cleanly.

**Fallback paths (5):**
4. `fetchJournalReflection_400_fallsBackToMock` — fetch returns 400; result matches shape of `getJournalReflection()` (any of the 8 mocks — since mock picks random, assert `result.id` starts with `"reflect-"` and `result.text` is non-empty).
5. `fetchJournalReflection_422SafetyBlock_fallsBackToMock` — 422 → mock fallback.
6. `fetchJournalReflection_502_fallsBackToMock` — 502 → mock fallback.
7. `fetchJournalReflection_networkError_fallsBackToMock` — fetch rejects with network error → mock fallback.
8. `fetchJournalReflection_timeoutTriggersFallback` — use `vi.useFakeTimers()`. Mock fetch to hang; advance 30_001ms; abort fires; result is mock.

**Shape validation (3):**
9. `fetchJournalReflection_missingDataField_fallsBackToMock` — 200 response with `{}` body → mock fallback.
10. `fetchJournalReflection_missingId_fallsBackToMock` — 200 response with `{data: {text: "valid reflection text here"}}` (no id) → mock fallback.
11. `fetchJournalReflection_tooShortText_fallsBackToMock` — 200 response with `{data: {id: "x", text: "short"}}` (below the 20-char frontend floor) → mock fallback.

#### `components/daily/__tests__/JournalTabContent.test.tsx` (modified)

The existing test file uses the synchronous `getJournalReflection` flow. After the spec, `handleReflect` calls `fetchJournalReflection` asynchronously.

**Changes:**

1. **Add mock at the top of the file:**
   ```typescript
   vi.mock('@/services/journal-reflection-service', () => ({
     fetchJournalReflection: vi.fn(),
   }))
   ```

2. **Import the mock handle and set a default in `beforeEach`:**
   ```typescript
   import { fetchJournalReflection } from '@/services/journal-reflection-service'
   const mockFetchJournalReflection = fetchJournalReflection as ReturnType<typeof vi.fn>

   // In beforeEach (or the top-level describe setup):
   mockFetchJournalReflection.mockReset()
   mockFetchJournalReflection.mockResolvedValue({
     id: 'reflect-test',
     text: 'Thank you for bringing these words here. Test reflection.',
   })
   ```

3. **Update any reflect-related tests.** Search for `/reflect/i` button clicks in the existing test file. Any test that clicks the "Reflect on my entry" button and asserts the reflection text now needs to await:
   - Before: `await user.click(reflectButton); expect(screen.getByText(/Test reflection/)).toBeInTheDocument()`
   - After: `await user.click(reflectButton); expect(await screen.findByText(/Test reflection/)).toBeInTheDocument()`

4. **Add new tests for loading UI** (~3 new tests):
   - `reflect_showsLoadingStateWhilePending` — mock `fetchJournalReflection` to return a never-resolving promise. Click reflect. Assert "Reflecting on your words…" text appears. Assert the reflect button is NOT in the document (replaced by loading state).
   - `reflect_hidesLoadingStateOnResolve` — mock resolves with a valid reflection. Click reflect. Await the reflection text. Assert "Reflecting on your words…" is NOT in the document (loading replaced by reflection).
   - `reflect_supportsMultipleEntriesLoadingConcurrently` — render with two saved entries. Mock `fetchJournalReflection` to return two hanging promises. Click reflect on entry A, then on entry B. Assert BOTH entries show "Reflecting on your words…" simultaneously. (This validates `reflectingIds` is a Set, not a boolean.)

5. **Do NOT delete existing tests.** Auth-gate test (unauthenticated → modal) stays unchanged — the gate fires before `fetchJournalReflection`.

6. **Do NOT add `vi.useFakeTimers()` to this file if it doesn't already use them.** The component no longer has `setTimeout` in its reflect path; async flow uses real promise resolution.

**Verification:**
- [ ] Updated tests pass: `cd frontend && npm test -- --run JournalTabContent`
- [ ] New loading-UI tests pass
- [ ] Full frontend suite green

---

## Pre-Execution Checklist

### Branch state

- [ ] Current branch: `claude/feature/ai-integration-journal`
- [ ] `git status` clean
- [ ] `git log main --oneline -20` shows all five predecessor wave commits: "AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration", "AI-1: Ask AI Gemini integration", "AI-2: Prayer generation Gemini integration"

### Backend baseline

- [ ] `cd backend && ./mvnw test` passes on current branch baseline. Expected: ~193 tests green from Specs 1–3 + AI-1 + AI-2.
- [ ] `backend/.env.local` has `GEMINI_API_KEY=AIza...` populated (reused from Spec 2, unchanged through wave).
- [ ] `AskService`, `PrayerService`, `GeminiService`, `AskCrisisDetector`, and `PrayerCrisisDetector` compile cleanly and their tests pass (smoke check that prior specs are healthy).
- [ ] Verify `AskCrisisDetector.SELF_HARM_KEYWORDS` and `PrayerCrisisDetector.SELF_HARM_KEYWORDS` are still equal (i.e., AI-2 merged without drift). The three-way parity test in AI-3 depends on this.

### Frontend baseline

- [ ] `cd frontend && npm test -- --run` passes baseline.
- [ ] `cd frontend && npm run build` succeeds.
- [ ] `/daily?tab=journal` loads in dev server, can save an entry and click "Reflect on my entry" to see the current synchronous mock behavior.
- [ ] `/ask` and `/daily?tab=pray` both work end-to-end with real Gemini (AI-1 + AI-2 regression check).

### CI / dev-loop readiness

- [ ] Backend runs via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`.
- [ ] `/api/v1/health` returns `providers.gemini.configured: true`.

### Charter carryover

Same 7-condition charter as Specs 2/3/AI-1/AI-2. Uncertainty = stop. Expected carryover behaviors:

- D2b test seam + reflection-based Client injection (AI-1 precedent, AI-2 reuse)
- D7 framework log suppression active
- D9 enum-based safety detection
- Crisis keyword parity pattern (AI-1 + AI-2 precedent) extended to three-way
- Non-Docker smoke (Spec 3 D-addendum)

### Expected deviations to anticipate

- **Schema construction detail**: the 2-field schema is simpler than AI-1/AI-2. Still use the same `Schema.builder()` pattern — no inventing new mechanisms.
- **`@PostConstruct` in tests**: will not fire on manual `new`. Use reflection-based injection (AI-1/AI-2 precedent).

---

## Acceptance Criteria

### Functional

- [ ] `POST /api/v1/proxy/ai/reflect-journal` returns 200 with `{data: JournalReflectionResponseDto, meta: {requestId}}` for valid entries, hitting real Gemini upstream
- [ ] Crisis-keyword entries (e.g., entry containing "I want to die") return 200 with `data.id == "crisis"`, `data.text` contains "988" and "741741", NO Gemini upstream call (verify via backend log)
- [ ] Generated reflection text is 50–800 chars (backend validator) — real Gemini responses typically 150–500 chars for 2–4 sentences
- [ ] Reflection references specific details from the entry. Manual eyeball test: write a journal entry that mentions a named person, click reflect, assert the reflection references that person by name or role.
- [ ] Invalid bodies return 400 with `ProxyError` shape (missing, blank, or oversized `entry`)
- [ ] Gemini safety blocks return 422 with `code: SAFETY_BLOCK`
- [ ] Visiting `/daily?tab=journal`, saving an entry, clicking "Reflect on my entry" produces an AI-generated reflection (not a canned mock). Verify by: (a) reflection text is unique across different entries, (b) network tab shows POST to `/api/v1/proxy/ai/reflect-journal`

### Frontend loading UX

- [ ] Clicking "Reflect on my entry" immediately replaces the button with a "Reflecting on your words…" pill containing a spinner
- [ ] Once the response arrives, the loading pill is replaced by the rendered reflection box
- [ ] Two entries can be reflecting concurrently; each shows its own loading pill independently
- [ ] `motion-reduce: animate-none` respected — with prefers-reduced-motion, spinner does not animate
- [ ] `role="status"` + `aria-live="polite"` announces state change to screen readers

### Frontend graceful degradation

- [ ] With backend stopped, clicking "Reflect on my entry" still works — result is one of the 8 mock reflections. No error toasts, no broken UI, no blank state
- [ ] Slow Gemini (>30s) aborts and falls back to mock within the timeout budget
- [ ] Malformed backend response (`{data: {text: "abc"}}` — missing id) falls through to mock — frontend shape validator catches it
- [ ] Side effects on save (`markJournalComplete`, `recordActivity`) still fire on entry SAVE (unchanged); reflection flow does NOT additionally fire them

### Security invariants (inherit from Specs 1–3 + AI-1 + AI-2)

- [ ] No upstream error text leaks to client. Verified by `noLeakOfUpstreamErrorText` unit test + `fullLifecycle_noUpstreamErrorTextLeaks` integration test.
- [ ] Backend logs contain ONLY `entryLength` for reflection requests — never `entry` content, never response `text` content. Verify via `grep 'entry=' backend.log | wc -l` = 0 post-request.
- [ ] `X-Request-Id` and rate-limit headers present on all responses
- [ ] No new API keys on the frontend — bundle grep for `AIza` still returns 0 post-merge

### Crisis response invariants

- [ ] Crisis reflection text contains "988" literal
- [ ] Crisis reflection text contains "741741" literal
- [ ] Crisis reflection passes the 50–800 char bounds (currently ~460 chars)
- [ ] Backend `JournalReflectionCrisisDetector.SELF_HARM_KEYWORDS` list is: (a) a superset of frontend `SELF_HARM_KEYWORDS`, (b) equal to `AskCrisisDetector.SELF_HARM_KEYWORDS`, (c) equal to `PrayerCrisisDetector.SELF_HARM_KEYWORDS`. Verified by three parity tests.

### Quality invariants

- [ ] Prompt rules enforced by `JournalReflectionPromptsTest` — all 5 rules present verbatim
- [ ] `FALLBACK_REFLECTION` passes the length validator (verified by `fallbackReflection_matchesLengthBounds`)
- [ ] Retry-on-validation-failure works (verified by `reflect_tooShortTextTriggersRetry`, `reflect_tooLongTextTriggersRetry`)
- [ ] After 2 validation failures, service returns `FALLBACK_REFLECTION` with WARN log

### Test coverage

- [ ] All ~15 tests in `JournalReflectionServiceTest` pass
- [ ] All 8 tests in `JournalReflectionControllerTest` pass
- [ ] All 5 tests in `JournalReflectionIntegrationTest` pass
- [ ] All 6 tests in `JournalReflectionPromptsTest` pass
- [ ] All 9 tests in `JournalReflectionCrisisDetectorTest` pass (including both peer parity tests)
- [ ] All 11 tests in `services/__tests__/journal-reflection-service.test.ts` pass
- [ ] Updated `JournalTabContent.test.tsx` still passes, plus 3 new loading-UI tests
- [ ] No tests skipped, no `xit` / `it.skip` / `it.todo`

### CI / build

- [ ] `cd backend && ./mvnw test` exit 0 — expected ~236 tests green (193 baseline + 43 new)
- [ ] `cd frontend && npm run build` succeeds
- [ ] `cd frontend && npm test -- --run` exit 0 — expected 14+ new tests (11 service + 3 loading-UI), no regressions
- [ ] Bundle scans: `AIza` 0, `VITE_GEMINI_API_KEY` 0, `generativelanguage.googleapis.com` 0, `/api/v1/proxy/ai/reflect-journal` ≥1, `/api/v1/proxy/ai/pray` ≥1 (AI-2 regression), `/api/v1/proxy/ai/ask` ≥1 (AI-1 regression)

### Runtime verification (Docker-free smoke, per Spec 3 pattern)

- [ ] Start backend via `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- [ ] Health probe: `curl -s http://localhost:8080/api/v1/health | jq .providers.gemini.configured` returns `true`
- [ ] Journal reflection smoke (real Gemini):
  ```bash
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect-journal \
    -H 'Content-Type: application/json' \
    -d '{"entry":"Today I sat in silence for a long time. I kept thinking about my grandmother and all the things I wish I had said to her before she passed last spring. It feels heavy but also holy to just remember her today."}' \
    | jq '{id: .data.id, textLength: (.data.text | length), mentionsGrandmother: (.data.text | test("grandmother|her")), requestId: .meta.requestId}'
  ```
  Expect: `textLength` 150–500 (2–4 sentences), `mentionsGrandmother: true` (validates specificity rule #3), `requestId` is a 22-char base64 string.
- [ ] Crisis smoke:
  ```bash
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect-journal \
    -H 'Content-Type: application/json' \
    -d '{"entry":"I don'\''t want to be here anymore. I want to die."}' \
    | jq '{id: .data.id, has988: (.data.text | contains("988")), has741741: (.data.text | contains("741741"))}'
  ```
  Expect: `id: "crisis"`, `has988: true`, `has741741: true`. Backend log shows "Journal reflection crisis path triggered entryLength=..." INFO line and NO Gemini call for this request ID.
- [ ] Long-entry smoke (stress-test 5000-char path):
  ```bash
  curl -s -X POST http://localhost:8080/api/v1/proxy/ai/reflect-journal \
    -H 'Content-Type: application/json' \
    -d "{\"entry\":\"$(yes 'Today I am grateful. ' | head -200 | tr -d '\n' | head -c 5000)\"}" \
    | jq '{id: .data.id, textLength: (.data.text | length)}'
  ```
  Expect: 200 with valid DTO (validates `@Size(max=5000)` accepts, Gemini handles long input).
- [ ] Invalid input: `curl -s .../reflect-journal -d '{"entry":""}' | jq .code` returns `"INVALID_INPUT"`.
- [ ] PII leak grep — the CRITICAL check (journal entries are the most sensitive content in the app):
  ```bash
  grep -iE 'entry=.+(grandmother|want to die|grateful|today)|content=.+' /tmp/worship-room-backend.log | wc -l
  ```
  Expect `0`. Controller logs only `entryLength=<integer>`.
- [ ] Rate-limit headers present on success.
- [ ] `/ask` still works (AI-1 regression).
- [ ] `/daily?tab=pray` still produces real prayers (AI-2 regression).

### Operational

- [ ] After merge: nothing to do. Gemini key unchanged. Users immediately see real AI reflections on `/daily?tab=journal`.
- [ ] **Wave complete.** All three user-facing AI features (Ask, Pray, Journal Reflection) now run on real Gemini through the proxy. No mock is the primary source anywhere.

---

## See Also

- `_specs/ai-proxy-foundation.md` (Spec 1, merged) — provides shared proxy infrastructure
- `_specs/ai-proxy-gemini.md` (Spec 2, merged) — Gemini SDK patterns, D2b test seam, D7 framework log suppression, D9 enum-based safety detection. **IMPORTANT:** Spec 2 already claims `/api/v1/proxy/ai/reflect` for Bible verse reflection. AI-3 uses `/reflect-journal` to avoid collision.
- `_specs/ai-proxy-maps.md` (Spec 3, merged) — non-Docker smoke pattern
- `_specs/ai-integration-ask.md` (Spec AI-1, merged) — proxy wave foundation for user-facing AI features
- `_specs/ai-integration-pray.md` (Spec AI-2, merged) — **primary structural template for this spec**. Copy patterns verbatim: `PrayerService` → `JournalReflectionService`, `PrayerController` → `JournalReflectionController`, `PrayerCrisisDetector` → `JournalReflectionCrisisDetector`, `PrayerPrompts` → `JournalReflectionPrompts`. Retry-once-then-fallback. Crisis parity test extended to three-way.
- `frontend/src/mocks/daily-experience-mock-data.ts` — source of the 8 canned fallback reflections. Not modified by this spec.
- `frontend/src/constants/crisis-resources.ts` — frontend source of truth for crisis keywords.
- `frontend/src/constants/content-limits.ts` — source of `JOURNAL_MAX_LENGTH = 5000` that backend `@Size(max=5000)` matches.
- `.claude/rules/01-ai-safety.md` § Crisis Intervention Protocol — server-side crisis short-circuit satisfies this; journal is the highest-stakes AI endpoint because saved entries contain the most concentrated emotional content
- `.claude/rules/02-security.md` § Never Leak Upstream Error Text — enforced via `mapGeminiException` chokepoint
- `.claude/rules/07-logging-monitoring.md` § PII handling — controller logs `entryLength` only, never content

---

## Out of Scope (deferred to future specs)

- **AI Integration Wave is CLOSED** after this spec. No AI-4 planned. If future AI features are needed (e.g., Meditation guidance generation, Prayer Wall auto-moderation, Devotional auto-generation), each gets its own standalone spec.
- **Server-side caching** — each reflection is entry-specific; cache hit rate near zero. Same reasoning as AI-1/AI-2.
- **Streaming reflection output** — Gemini supports streaming but synchronous is simpler; reflections are short enough (2–4 sentences) that streaming's perceived-latency gains are marginal.
- **Re-reflect button** — allowing users to regenerate a reflection they don't love. Future UX enhancement; out of scope here.
- **Save reflection to user history** — currently the reflection is attached to the in-memory saved entry state; it persists to localStorage via the existing `SavedJournalEntry.reflection` field. Dedicated reflection history view is a future feature.
- **Reflection sharing** — ability to share a reflection as an image/card. Out of scope.
- **Multi-turn reflection dialogue** — asking follow-up questions about a reflection. Future.
- **Model swap to larger Gemini variant** — `gemini-2.5-flash` or `gemini-2.5-pro` could improve nuance at higher cost. One-line change in `JournalReflectionService.MODEL` if desired after feedback.
- **Devotional context passthrough** — passing the devotional snapshot to the backend for richer context-aware reflection. Current design infers tone from entry content. Future spec if heuristic proves insufficient.
- **Reflection quality feedback loop** — thumbs up/down on reflections for quality monitoring. Future.
- **Auto-reflect on save** — automatically generating a reflection when the entry is saved, instead of requiring a button click. Rejected here: (a) uses Gemini quota even for users who don't want a reflection, (b) loses the intentionality of the user choosing to reflect.
