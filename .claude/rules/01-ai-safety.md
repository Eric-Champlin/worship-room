## AI Safety & Ethics

**CRITICAL**: This application deals with emotional and spiritual well-being. AI safety guardrails are mandatory.

### Community Guidelines (canonical user-facing copy)

The Community Guidelines for Worship Room live at `content/community-guidelines.md` (repo root). That document is the canonical source of truth for what users may share, what they may not share, and how the app handles crisis content from a user-facing perspective. Any user-facing copy that touches conduct, content boundaries, or crisis protocol — including Prayer Wall composer hints, crisis banners, moderation action notifications, registration consent, and welcome emails — must align with the Guidelines in voice, claims, and the resources it names. The technical crisis-detection rules in this file (the rest of the section below) and the user-facing voice in the Guidelines are two halves of the same policy: this file owns the engineering contract; the Guidelines own the way we describe it to people. Updates to the Guidelines themselves go through their own spec, not as a side-effect of feature work.

### Privacy Policy and Terms of Service (canonical legal documents)

The Worship Room Privacy Policy at `content/privacy-policy.md` and the Worship Room Terms of Service at `content/terms-of-service.md` are the canonical legal-precise descriptions of what data Worship Room collects, who it's shared with, what users own and license to us, and the limits of what we promise. Any user-facing copy that makes data-handling claims — onboarding microcopy, settings descriptions, AI feature disclaimers, third-party-vendor mentions, account deletion flows, cookie or analytics statements, security or encryption commitments, retention claims, and any "we don't track you / we don't share / we don't sell data" assertion — must align with the Privacy Policy in claims, scope, and what's affirmatively absent (no analytics, no third-party tracking, no email sent today). Any user-facing copy that touches eligibility, account responsibilities, prohibited conduct, content licensing, disclaimers, or the limits of liability must align with the Terms of Service. When the documents and existing copy disagree, the documents win and the copy is updated; introducing a new commitment in microcopy that isn't in the documents is a violation of this rule. Updates to either document go through their own spec, not as a side-effect of feature work.

### Crisis Intervention Protocol
- **Self-Harm Detection**: Use a lightweight classifier step (LLM or rules+LLM) for crisis detection; keywords are a fallback, not the sole method
  - **Primary**: Send user input through the backend AI proxy (`/api/v1/proxy/ai/*`) with system prompt: "Is this text indicating self-harm, suicide ideation, or immediate danger? Return JSON only: { \"isCrisis\": boolean, \"confidence\": 0-1, \"category\": \"self-harm|abuse|other|none\" }". The proxy currently routes to Gemini 2.5 Flash Lite; the provider is an implementation detail behind the proxy and can swap without frontend changes.
  - **Fallback Keywords**: "suicide", "kill myself", "end it all", "not worth living", "hurt myself", etc.
  - **Important**: Run crisis detection on the backend (not the client) to prevent bypassing. The client-side `containsCrisisKeyword()` function is a courtesy fast-path; the authoritative check is server-side.
  - **Response Parsing**:
    - Parse JSON response deterministically
    - Show crisis resources if: `isCrisis: true` AND `confidence > 0.7`
    - **OR** if `category == "self-harm"` regardless of confidence (fail safe for self-harm)
    - **Fail Closed (UI only)**: If parsing fails OR model returns invalid JSON → treat as `isCrisis=true` and show crisis resources in the UI (better to show resources unnecessarily than miss a real crisis)
    - **Important**: Fail-closed applies to showing crisis resources in the UI. Do NOT auto-flag content or notify admin unless classification parsing succeeds (or clear keyword match). This prevents false admin alerts when the upstream LLM returns malformed JSON.
  - Action: Immediately display crisis resources if detected
- **Crisis Resources Display**:
  - 988 Suicide & Crisis Lifeline: 988
  - Crisis Text Line: Text HOME to 741741
  - SAMHSA National Helpline: 1-800-662-4357
  - Encourage user to seek professional help immediately
- **Escalation**: Prayer wall posts with self-harm content are flagged (classifier success OR clear keyword match) and emailed to admin immediately

### AI Content Boundaries
- **Medical Disclaimer**: "This is not professional medical, psychological, or psychiatric advice. If you are experiencing a mental health crisis, please contact a licensed professional or crisis hotline."
- **Theological Boundaries**:
  - Never claim divine authority or revelation
  - Avoid "God told me" or deterministic theological claims
  - No denominational bias
  - Always phrase as encouragement, not authoritative interpretation
  - Use language like "Scripture encourages us..." not "God is telling you..."
- **Never Provide**:
  - Medical or psychological diagnoses
  - Prescription or treatment recommendations
  - Definitive life decisions ("You should break up", "You should quit your job")
  - Financial advice
  - Legal advice

### AI-Generated Content Guidelines
- **Tone**: Always encouraging, hopeful, compassionate, never preachy or judgmental
- **Personalization**: Use user's context sensitively without making assumptions
- **Respect**: Honor user's emotional state, never minimize or dismiss feelings
- **Boundaries**: If user's request is inappropriate or beyond AI capabilities, gracefully decline and suggest alternatives (e.g., "I'm here to provide spiritual encouragement. For medical concerns, please consult a healthcare professional.")
- **Accuracy**: Scripture references must be accurate and properly attributed
- **Cultural Sensitivity**: Respect diverse Christian traditions and cultural contexts

### Content Moderation
- **AI Auto-Moderation** (Prayer Wall):
  - Flag: Profanity, hate speech, abuse, spam, self-harm content, inappropriate sexual content
  - Do NOT auto-delete - send to admin review queue
  - Email admin immediately for flagged posts
- **User Reporting**: Allow users to report concerning content
- **Admin Oversight**: Human (admin) final decision on content removal

### Data Privacy & Safety
- **User Data**: Never share user's personal information, mood data, or journal entries with third parties
- **AI Training**: Do not use user data to train AI models (per the upstream LLM provider's API terms — Gemini policy currently applies; the proxy isolates this so the provider can change)
- **Encryption**: See [05-database.md](05-database.md) for encryption policies (journal entries encrypted, prayer wall posts not, encrypt/decrypt on backend only)
- **Anonymization**: Mood tracking analytics should be anonymized

### Disclaimers (Required on Site)
- **Homepage Footer**:
  - "Worship Room provides spiritual encouragement and support. It is not a substitute for professional medical, psychological, or psychiatric care. If you are in crisis, please call 988 (Suicide & Crisis Lifeline) or contact a licensed mental health professional."
- **AI-Generated Content**:
  - Small disclaimer below AI-generated prayers/reflections: "AI-generated content for encouragement. Not professional advice."

### Data Retention & Deletion

See [05-database.md](05-database.md) for full data retention and deletion policies. Key principle: journals hard-deleted, prayer wall posts soft-deleted (content replaced, user_id nulled), audit logs retained indefinitely.

### Crisis Resources (Hardcoded Constants)
```typescript
// frontend/src/constants/crisis-resources.ts
export const CRISIS_RESOURCES = {
  suicide_prevention: {
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    link: "https://988lifeline.org",
  },
  crisis_text: {
    name: "Crisis Text Line",
    text: "Text HOME to 741741",
    link: "https://www.crisistextline.org",
  },
  samhsa: {
    name: "SAMHSA National Helpline",
    phone: "1-800-662-4357",
    link: "https://www.samhsa.gov/find-help/national-helpline",
  },
};

export const SELF_HARM_KEYWORDS = [
  "suicide", "kill myself", "end it all", "not worth living",
  "hurt myself", "end my life", "want to die", "better off dead",
  // Add more as needed
];
```
