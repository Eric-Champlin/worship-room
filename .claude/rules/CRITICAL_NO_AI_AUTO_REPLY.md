# CRITICAL: NO AI Auto-Reply to User Content

**Status:** HARD ENFORCEMENT GATE. Code review hard-blocks any PR that violates this rule unless the PR explicitly documents how crisis-content exclusion is enforced.

**Owner:** Established by Spec 6.4 (3am Watch v1), 2026-05-13. Reinforced by Universal Rule 13 (Crisis detection supersession).

---

## The rule

**Any code path that invokes an LLM/AI on user-generated content MUST first verify the content is NOT crisis-flagged. If crisis-flagged, do NOT invoke the LLM; return a neutral non-AI response (or no response at all — see "Acceptable patterns" below).**

"User-generated content" includes:
- Post body (`Post.body`, `posts.content`)
- Comment body (`PostComment.body`, `post_comments.content`)
- Journal entry text (`JournalEntry.text`, journal storage)
- Prayer body (`PrayerRequest.body`, any user-typed prayer text)
- Any future user-typed text field that surfaces in a feed or notification

"AI/LLM" includes (non-exhaustive — match by import path):
- `openai` SDK
- `anthropic` SDK
- `claude` SDK or `@anthropic-ai/sdk`
- `gemini` / `@google/generative-ai` SDK
- Any custom proxy endpoint that ultimately routes to one of the above (e.g., `/api/v1/proxy/ai/*`)
- Future LLM SDKs (Mistral, Cohere, etc.) — match by adding to the grep list in this file

## Why

The 3am Watch (Spec 6.4) and Crisis Detection (Spec 3.5/3.6, Universal Rule 13) establish that the Worship Room product surfaces crisis-flagged content with intentional silence: a 988 banner, real human resources, and NO algorithmic engagement. An AI auto-reply to a crisis post would:

1. **Substitute machine intimacy for human help.** A user in crisis needs real connection (988, a counselor, a friend). An AI reply gives the illusion of being heard without the substance.
2. **Cross the medical-disclaimer boundary.** Worship Room's AI features explicitly disclaim "not professional medical advice" (`01-ai-safety.md` § AI Content Boundaries). Replying to a crisis post crosses into territory that requires actual licensure.
3. **Risk wrong direction at maximum stakes.** LLMs occasionally produce harmful suggestions even with safety prompts. The cost of a wrong answer to a person in crisis is irreversible.

The product position is unambiguous: **crisis-flagged content is human-only territory.** No AI summary, no AI suggestion, no AI reply, no AI surfaced "you might also like" recommendation, no AI-generated encouragement, no AI-classified routing to a moderator unless the moderator is a real human reviewing a queue.

## Enforcement mechanism

**Code review check:** `/code-review` MUST grep the diff for new imports matching `openai|anthropic|claude|gemini|@anthropic-ai|@google/generative-ai` (case-insensitive) AND a file path that touches user content (post, comment, journal, prayer, message). For any match, the review MUST verify the PR documents how crisis-content exclusion is enforced — typically by reading `Post.crisisFlag` (or equivalent column on Comment/Journal) and short-circuiting the LLM invocation when true.

**Recommended pattern when implementing future AI features on user content:**

```java
public AiResult generateReply(UUID postId) {
    Post post = postRepository.findById(postId).orElseThrow();
    if (post.isCrisisFlag()) {
        // CRITICAL: NO AI Auto-Reply to crisis-flagged content per
        // .claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md.
        return AiResult.skipped("crisis_flagged");
    }
    return aiClient.complete(post.getBody());
}
```

```typescript
// Frontend equivalent
async function maybeGenerateAiReply(post: Post): Promise<string | null> {
  if (post.crisisFlag) {
    // CRITICAL: NO AI Auto-Reply to crisis-flagged content per
    // .claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md.
    return null
  }
  return await fetchAiReply(post.body)
}
```

## Acceptable patterns

The rule prohibits invoking AI **on crisis-flagged user content.** It does NOT prohibit:

- AI features on Bible verse text (BB-30 Explain, BB-31 Reflect — these operate on scripture, not user content)
- AI features on the user's OWN journal entry that THEY explicitly invoke (e.g., AI-3 Journal Reflection — user-initiated, on their own content, not crisis-routed)
- AI features that the user explicitly opts into for non-crisis content (e.g., a user typing into the Ask Bible chat — the input is a question, not crisis-flagged content)
- Background non-AI moderation (regex keyword detectors, rate limiters, crisis classifiers themselves — these don't generate replies, they CLASSIFY)

The boundary is **"AI generating a response that surfaces on or relates to crisis-flagged content."** Classification engines (PostCrisisDetector) are explicitly allowed — they're how `crisisFlag` gets set in the first place.

## Cross-references

- `.claude/rules/01-ai-safety.md` — AI Safety & Ethics (Crisis Intervention Protocol, AI Content Boundaries)
- `_forums_master_plan/round3-master-plan.md` Universal Rule 13 — Crisis detection supersession
- `_specs/forums/spec-3-5.md` and `spec-3-6.md` — Crisis classifier + CrisisAlertService canonical entry point
- `_specs/forums/spec-6-4.md` § Gate-G-NO-AI-AUTO-REPLY — the originating gate

## Updating this rule

If a future spec proposes loosening this rule (e.g., AI-summarized moderator queue entries for crisis-flagged content reviewed by humans), the proposal MUST come through a dedicated spec with Eric's explicit approval AND a documented harm-reduction trade-off analysis. NOT a side-effect of any feature spec. The rule is durable; modifications are intentional.
