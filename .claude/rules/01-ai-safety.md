## AI Safety & Ethics

**CRITICAL**: This application deals with emotional and spiritual well-being. AI safety guardrails are mandatory.

### Crisis Intervention Protocol
- **Self-Harm Detection**: Use a lightweight classifier step (LLM or rules+LLM) for crisis detection; keywords are a fallback, not the sole method
  - **Primary**: Send user input to OpenAI with system prompt: "Is this text indicating self-harm, suicide ideation, or immediate danger? Return JSON only: { \"isCrisis\": boolean, \"confidence\": 0-1, \"category\": \"self-harm|abuse|other|none\" }"
  - **Fallback Keywords**: "suicide", "kill myself", "end it all", "not worth living", "hurt myself", etc.
  - **Important**: Run crisis detection on the backend (not the client) to prevent bypassing
  - **Response Parsing**:
    - Parse JSON response deterministically
    - Show crisis resources if: `isCrisis: true` AND `confidence > 0.7`
    - **OR** if `category == "self-harm"` regardless of confidence (fail safe for self-harm)
    - **Fail Closed (UI only)**: If parsing fails OR model returns invalid JSON → treat as `isCrisis=true` and show crisis resources in the UI (better to show resources unnecessarily than miss a real crisis)
    - **Important**: Fail-closed applies to showing crisis resources in the UI. Do NOT auto-flag content or notify admin unless classification parsing succeeds (or clear keyword match). This prevents false admin alerts when OpenAI returns malformed JSON.
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
- **AI Training**: Do not use user data to train AI models (per OpenAI API terms)
- **Encryption**: Encrypt sensitive private content at the application layer before writing to database (not only disk-level encryption)
  - **Journal Entries**: Always encrypted (private content)
  - **Prayer Wall Posts**: NOT encrypted (public by design for community sharing)
  - **Mood Selections**: NOT encrypted (analytics data). MVP: only persisted for logged-in users
  - **Key Management**: Encryption keys stored in env/secret manager; rotate keys periodically; never commit keys to repository
  - **Important**: Encrypt/decrypt only on backend; frontend never sees encryption keys
- **Anonymization**: Mood tracking analytics should be anonymized

### Disclaimers (Required on Site)
- **Homepage Footer**:
  - "Worship Room provides spiritual encouragement and support. It is not a substitute for professional medical, psychological, or psychiatric care. If you are in crisis, please call 988 (Suicide & Crisis Lifeline) or contact a licensed mental health professional."
- **AI-Generated Content**:
  - Small disclaimer below AI-generated prayers/reflections: "AI-generated content for encouragement. Not professional advice."

### Data Retention & Deletion
- **Account Deletion**: User can delete their account via profile settings
  - **Journal Entries**: Hard deleted (permanently removed from database)
  - **Mood Selections**: Hard deleted OR anonymized (user_id set to NULL, description cleared if present)
  - **Prayer Wall Posts**: Soft deleted with precise definition:
    - `is_deleted = true`
    - `content` replaced with `"[deleted]"` or empty string
    - `title` replaced with `"[deleted]"`
    - `user_id` set to NULL
    - Timestamps retained (`created_at`, `updated_at`)
    - Post remains in database for audit/moderation history but content is unrecoverable
  - **Audit Logs**: Retained indefinitely (does not contain journal content, only admin actions)
- **Backups**: Database backups retained for 30 days, then purged
- **Data Export**: User can export their data (journal entries, mood history) before deletion (future feature)

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
