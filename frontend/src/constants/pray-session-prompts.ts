// Spec 6.2b — Prayer Length Options
// Curated prompts for 1/5/10-minute silent prayer sessions.
// Approved per Gate-G-PROMPT-COPY. Anti-pressure voice; no exclamation points.

export type PrayPrompt = {
  text: string
  silenceMs: number
  fixedPosition?: 'first' | 'last'
}

// 1-minute session: 2 prompts. Both are effectively fixed-position (first/last
// of an array of 2). Silence intervals tuned to ~60s total session length.
export const PRAY_PROMPTS_1MIN: ReadonlyArray<PrayPrompt> = [
  { text: "Breathe. What's heavy right now?", silenceMs: 25_000, fixedPosition: 'first' },
  { text: 'Hand it over.', silenceMs: 18_000 },
] as const

// 5-minute session: 5 prompts. First (settle) and last (sit) are fixed-position.
// Middle 3 shuffle per session.
export const PRAY_PROMPTS_5MIN: ReadonlyArray<PrayPrompt> = [
  { text: 'Settle. Notice your breath.', silenceMs: 35_000, fixedPosition: 'first' },
  { text: 'Who needs prayer today?', silenceMs: 70_000 },
  { text: 'Name what hurts.', silenceMs: 55_000 },
  { text: 'Thank God for one thing.', silenceMs: 50_000 },
  { text: 'Sit with God in silence.', silenceMs: 55_000, fixedPosition: 'last' },
] as const

// 10-minute session: 8 prompts. First (settle) and last (silence) fixed-position.
// Middle 6 shuffle per session.
export const PRAY_PROMPTS_10MIN: ReadonlyArray<PrayPrompt> = [
  { text: 'Settle. Breathe deeply, three times.', silenceMs: 60_000, fixedPosition: 'first' },
  { text: 'Where has God been in your day?', silenceMs: 70_000 },
  { text: 'Who needs prayer? Name them.', silenceMs: 75_000 },
  { text: 'Hold one person in your heart.', silenceMs: 75_000 },
  { text: 'Name what hurts in your own life.', silenceMs: 70_000 },
  { text: 'Where do you need wisdom?', silenceMs: 65_000 },
  { text: 'Thank God for three things.', silenceMs: 75_000 },
  { text: 'Sit in silence with the Father.', silenceMs: 70_000, fixedPosition: 'last' },
] as const

// Per-prompt timing constants (visible / fade) — D-SilenceTiming.
export const PROMPT_VISIBLE_MS = 5_000
export const PROMPT_FADE_IN_MS = 1_500
export const PROMPT_FADE_OUT_MS = 1_500
export const AMEN_SCREEN_HOLD_MS = 3_000

type PromptLength = 1 | 5 | 10

const EXPECTED_COUNTS: Record<PromptLength, number> = { 1: 2, 5: 5, 10: 8 }

const ARRAYS_BY_LENGTH: Record<PromptLength, ReadonlyArray<PrayPrompt>> = {
  1: PRAY_PROMPTS_1MIN,
  5: PRAY_PROMPTS_5MIN,
  10: PRAY_PROMPTS_10MIN,
}

// Module-load validator. Throws on misconfiguration so test/dev environments
// surface drift before it reaches production.
function validatePrompts(length: PromptLength, prompts: ReadonlyArray<PrayPrompt>): void {
  if (prompts.length !== EXPECTED_COUNTS[length]) {
    throw new Error(
      `[pray-session-prompts] Expected ${EXPECTED_COUNTS[length]} prompts for ${length}-min session, got ${prompts.length}`,
    )
  }
  prompts.forEach((p, i) => {
    if (!p.text || p.text.trim().length === 0) {
      throw new Error(`[pray-session-prompts] Empty text at ${length}-min[${i}]`)
    }
    if (!Number.isFinite(p.silenceMs) || p.silenceMs <= 0) {
      throw new Error(`[pray-session-prompts] Non-positive silenceMs at ${length}-min[${i}]`)
    }
  })
  if (prompts[0].fixedPosition !== 'first') {
    throw new Error(
      `[pray-session-prompts] First prompt of ${length}-min must be fixedPosition: 'first'`,
    )
  }
  if (length !== 1) {
    const last = prompts[prompts.length - 1]
    if (last.fixedPosition !== 'last') {
      throw new Error(
        `[pray-session-prompts] Last prompt of ${length}-min must be fixedPosition: 'last'`,
      )
    }
  }
  prompts.slice(1, -1).forEach((p, i) => {
    if (p.fixedPosition !== undefined) {
      throw new Error(
        `[pray-session-prompts] Interior prompt at ${length}-min[${i + 1}] must NOT have fixedPosition`,
      )
    }
  })
}

validatePrompts(1, PRAY_PROMPTS_1MIN)
validatePrompts(5, PRAY_PROMPTS_5MIN)
validatePrompts(10, PRAY_PROMPTS_10MIN)

export function getPromptsForLength(length: PromptLength): ReadonlyArray<PrayPrompt> {
  return ARRAYS_BY_LENGTH[length]
}
