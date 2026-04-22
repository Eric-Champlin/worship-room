# AI Integration: Prayer Generation (Spec AI-2 of 3)

**Spec ID:** ai-integration-pray
**Wave:** AI Integration (3-spec series: Ask, Prayer Generation, Journal Reflection — this is AI-2 of 3)
**Track:** Backend Gemini proxy endpoint + frontend mock-to-real swap for the Pray tab's free-form prayer generation
**Branch:** `claude/feature/ai-integration-pray` — cut from `main` after AI-1 (`ai-integration-ask`) merges
**Depends on:** Full AI-1 wave in main. Spec 1 (`ai-proxy-foundation.md`) merged. Spec 2 (`ai-proxy-gemini.md`) merged. Spec 3 (`ai-proxy-maps.md`) merged. Spec AI-1 (`ai-integration-ask.md`) merged — AI-2 reuses the patterns AI-1 established (D2b test seam with reflection-based Client injection, retry-on-validation, server-side fallback constant, crisis parity test, backend mock fallback path).

> **Prerequisite verification:** run `git log main --oneline -15` and confirm the "AI proxy foundation", "Spec 2: migrate Gemini to backend proxy", "Spec 3: Maps proxy migration", and "AI-1: Ask AI Gemini integration" merge commits are all visible. If any is missing, do not proceed.

---

## ⚠️ CRITICAL EXECUTION RULES (read before coding)

1. **CC must stay on branch `claude/feature/ai-integration-pray` throughout.** Do NOT cut additional branches. Do NOT merge. Do NOT rebase. Do NOT run `git checkout`, `git commit`, `git push`, or any git subcommand. Eric handles all git operations manually.
2. **Before writing any code, CC verifies the current branch by running `git branch --show-current`.** If it's not `claude/feature/ai-integration-pray`, STOP and surface.
3. **Preserve the `MockPrayer` TypeScript contract EXACTLY.** `PrayTabContent.tsx`, `PrayerResponse.tsx`, and anything else that consumes a `MockPrayer` from `@/types/daily-experience` must see the same `{id, topic, text}` shape it sees today. The backend `PrayerResponseDto` is that shape, byte-for-byte. Zero component edits for shape reasons.
4. **"Dear God...Amen." structural invariant.** The existing mock's text always starts with a salutation (typically "Dear God,") and ends with "Amen." Existing tests assert `prayer.text.match(/^Dear God/)` and `/Amen\.$/`. Real Gemini output must uphold both invariants. The system prompt enforces them; the backend validator double-checks them before returning; if Gemini drifts off-pattern, retry once, then fall through to the server-side fallback canned prayer.
5. **Crisis detection is defense-in-depth.** The client-side `CrisisBanner` in `PrayerInput` stays in place unchanged. The backend ALSO runs a crisis check BEFORE calling Gemini; if triggered, the backend returns a canned crisis-response `PrayerResponseDto` that embeds 988/Crisis Text/SAMHSA resources directly in the prayer text, WITHOUT calling Gemini. This guarantees crisis resources surface even if the client-side layer is bypassed.
6. **Mock fallback stays as a last resort.** If the backend returns any error (HTTP status, network failure, timeout, or malformed response), the frontend calls the existing `getMockPrayer(text)` and renders that. The user never sees a raw error or empty prayer. The mock's 10 canned prayers are production-quality fallback content.
7. **Use exactly the code specified in this spec.** Match AI-1's conventions verbatim where they apply (they will apply almost everywhere). Deviations only under the charter's seven-condition gate.
8. **Do NOT add Maven dependencies.** `google-genai:1.51.0`, `spring-boot-starter-webflux`, `spring-boot-starter-validation` are all present from Specs 1–2. No new deps.
9. **Do NOT re-export `getMockPrayer` or keep mock-first behavior.** After this spec, the mock is a fallback path only — never the primary source for a happy-path request.

---

## Why this spec exists

Today, `/daily?tab=pray` is a convincing mock. The user types a prayer request (free text, up to 500 chars), sees a 1.5-second fake "generating" state, and receives one of 10 canned prayers selected by a local keyword matcher (anxiety, gratitude, healing, guidance, grief, forgiveness, relationships, strength, general, devotional). The prayers are well-crafted but they're not personalized — a user asking "pray for my custody hearing tomorrow" gets the generic "general" prayer because none of the 8 topic-keyword lists match "custody."

This spec wires Prayer Generation to real Gemini via the backend proxy. After this spec:

- User submits any prayer request → backend calls Gemini with a pastoral-tone system prompt → Gemini returns structured JSON matching the `MockPrayer` shape → frontend renders it through the existing `PrayerResponse` component, unchanged
- Crisis keywords detected (client-side AND server-side) → short-circuit to a crisis-response `PrayerResponseDto` with 988/Crisis Text/SAMHSA resources embedded in the prayer text. Does not call Gemini in the crisis path.
- Backend fails or returns malformed response → frontend falls back to the existing mock (`getMockPrayer`). User always sees a valid prayer.
- The "Dear God, ... Amen." structural contract is preserved by system-prompt rules AND server-side regex validation.

After this spec ships:

1. New backend endpoint `POST /api/v1/proxy/ai/pray` that accepts `{request}`, calls Gemini with structured-output prompting, returns `ProxyResponse<PrayerResponseDto>` matching the frontend `MockPrayer` type exactly.
2. `PrayTabContent.handleGenerate` swaps the `setTimeout(() => getMockPrayer(...), 1500)` block for `fetchPrayer(inputText).then(...)` with mock fallback on any error.
3. Backend and frontend both run crisis detection. Backend wins on response content — if server detects crisis, the prayer text IS the crisis resources (988, text HOME to 741741, etc.) in a pastoral frame.
4. `src/mocks/daily-experience-mock-data.ts` stays in place as the fallback. `getMockPrayer` remains exported and importable — unused on the happy path, the fallback path only.
5. OpenAPI gains the new path + schemas. Gemini safety-block responses (from Spec 2's `SafetyBlockException`) are already mapped.

---

## Affected Frontend Routes

- `/daily?tab=pray` (the Pray tab inside the Daily Hub)

---
