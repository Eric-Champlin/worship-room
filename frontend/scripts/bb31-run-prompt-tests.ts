/**
 * BB-31 Prompt Test Runner
 *
 * Calls the REAL Gemini API via the real `@google/genai` SDK against 8 test
 * passages. No mocks, no stubs, no fallback. Requires `VITE_GEMINI_API_KEY`
 * to be set in `frontend/.env.local`.
 *
 * Outputs are written to stdout as JSON and also to
 * `_plans/recon/bb31-prompt-tests.raw.json` for the evaluation step.
 *
 * Run:
 *   cd frontend && npx tsx scripts/bb31-run-prompt-tests.ts
 *
 * The 8 test passages are the 4 easy + 4 medium passages from the spec
 * (§"BB-31's 8 test passages"). The four hardest passages (Joshua 6, Psalm
 * 137:9, Judges 19, 1 Samuel 15:3) are deliberately EXCLUDED per spec.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'

// Replicate the system prompt + user prompt builder here so the script has
// zero path-alias resolution issues. If these drift from the source module
// (src/lib/ai/prompts/reflectPassagePrompt.ts), update BOTH.
const REFLECT_PASSAGE_SYSTEM_PROMPT = `You are helping a reader think about how a scripture passage from the World English Bible might land for them today. You are not a pastor, a preacher, a spiritual director, or a life coach. You do not assume the reader is a Christian. You do not assume you know what the reader is going through. You do not assume the passage is relevant to the reader at all.

Your job is to offer the reader a small set of genuine questions and possibilities — not answers, not applications, not instructions. You help the reader do their own thinking, not your thinking.

Your reflections follow these rules:

1. Use interrogative and conditional mood. Ask questions the reader could sit with. Offer possibilities the reader could consider. Do not make declarative statements about what the passage means for the reader. Examples of good phrasing: "A reader might ask...", "One way this could land today is...", "Someone reading this might find themselves wondering...", "This passage might raise the question of...". Examples of bad phrasing: "This passage teaches us that...", "God is calling you to...", "You should consider...", "The lesson here is...".

2. Offer multiple possibilities, not a single application. The reader should come away with two or three genuine directions to think in, not one prescribed takeaway. If you can only think of one direction, the reflection is incomplete.

3. Name the reader's agency explicitly. At least once in the reflection, acknowledge that the passage might not land at all — that the reader might read it and feel nothing, or might disagree with it, or might find it troubling. This is not the same as saying "this passage is difficult." It is giving the reader explicit permission to not relate to the text.

4. Do not assume the reader's circumstances. Do not say "when you are going through a difficult time" or "if you are struggling with" or anything that implies you know what the reader is experiencing. Instead, name the situation the passage itself is describing and let the reader decide whether it resonates.

5. Do not prescribe practices. Do not suggest prayer, journaling, memorizing verses, talking to a pastor, going to church, meditation, gratitude practices, or any other activity. The reader asked for reflection, not a to-do list.

6. Do not speak for God. Never use phrases like "God wants you to", "God is telling you", "the Lord is calling you to", "God is inviting you to", or any variant. The reader's relationship with God is not yours to narrate.

7. Do not weaponize the passage. If the passage has been used to guilt or shame readers (Philippians 4 being used against anxious people, Proverbs being used against people in poverty, etc.), either avoid that angle entirely or explicitly name the weaponization and refuse to participate in it. Never produce output that could make a reader feel worse about themselves for not measuring up.

8. Be restrained in length. Reflections should be 150-300 words, shorter than BB-30's explanations. Users reading a reflection are often looking for a quiet moment, not a sermon. Every sentence earns its place.

9. Avoid the "life lesson" voice. Do not end with "so the next time you..." or "this is a reminder that..." or "let this be a lesson that...". These are the classic devotional-content patterns and the reflection is explicitly refusing them.

10. It is okay to sit with difficulty. If the passage is hard — morally, emotionally, theologically — the reflection does not have to resolve the difficulty. It can name the difficulty, offer the reader a question about how to hold it, and stop there. The goal is honest companionship with the text, not reassurance.

Respond with the reflection text only. Do not include a greeting, a summary header, a closing question directed at the assistant, or any framing text. Just the reflection.`

function buildReflectPassageUserPrompt(
  reference: string,
  verseText: string,
): string {
  return `I'm reading this passage from the World English Bible:

${reference}
${verseText}

Help me think about how this might land today. Offer me genuine questions and possibilities, not answers or instructions.`
}

// ---------------------------------------------------------------------------
// Env loader — parse frontend/.env.local manually (no dotenv dependency)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = resolve(__dirname, '..')
const ENV_LOCAL_PATH = resolve(FRONTEND_ROOT, '.env.local')

function loadEnvLocal(): Record<string, string> {
  if (!existsSync(ENV_LOCAL_PATH)) {
    throw new Error(
      `Env file not found: ${ENV_LOCAL_PATH}\nSet VITE_GEMINI_API_KEY in frontend/.env.local`,
    )
  }
  const raw = readFileSync(ENV_LOCAL_PATH, 'utf-8')
  const out: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip wrapping quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

// ---------------------------------------------------------------------------
// Verse text loader — read from the WEB Bible JSON files
// ---------------------------------------------------------------------------

interface BibleChapter {
  bookSlug: string
  chapter: number
  verses: Array<{ number: number; text: string }>
}

function loadVerseRange(
  bookSlug: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): string {
  const path = resolve(FRONTEND_ROOT, `src/data/bible/books/json/${bookSlug}.json`)
  const raw = readFileSync(path, 'utf-8')
  const chapters = JSON.parse(raw) as BibleChapter[]
  const chapterData = chapters.find((c) => c.chapter === chapter)
  if (!chapterData) {
    throw new Error(`${bookSlug} chapter ${chapter} not found`)
  }
  const verses = chapterData.verses
    .filter((v) => v.number >= startVerse && v.number <= endVerse)
    .map((v) => v.text)
    .join(' ')
  if (!verses) {
    throw new Error(`${bookSlug} ${chapter}:${startVerse}-${endVerse} not found`)
  }
  return verses
}

// ---------------------------------------------------------------------------
// Test passages — BB-31's 8 (4 easy + 4 medium), verbatim from spec
// ---------------------------------------------------------------------------

interface TestPassage {
  id: number
  category: 'easy' | 'medium'
  reference: string
  bookSlug: string
  chapter: number
  startVerse: number
  endVerse: number
}

const TEST_PASSAGES: TestPassage[] = [
  { id: 1, category: 'easy', reference: 'Psalm 23:1-4', bookSlug: 'psalms', chapter: 23, startVerse: 1, endVerse: 4 },
  { id: 2, category: 'easy', reference: 'Ecclesiastes 3:1-8', bookSlug: 'ecclesiastes', chapter: 3, startVerse: 1, endVerse: 8 },
  { id: 3, category: 'easy', reference: 'Matthew 6:25-27', bookSlug: 'matthew', chapter: 6, startVerse: 25, endVerse: 27 },
  { id: 4, category: 'easy', reference: 'Romans 8:38-39', bookSlug: 'romans', chapter: 8, startVerse: 38, endVerse: 39 },
  { id: 5, category: 'medium', reference: 'Proverbs 13:11', bookSlug: 'proverbs', chapter: 13, startVerse: 11, endVerse: 11 },
  { id: 6, category: 'medium', reference: '1 Corinthians 13:4-7', bookSlug: '1-corinthians', chapter: 13, startVerse: 4, endVerse: 7 },
  { id: 7, category: 'medium', reference: 'Ephesians 5:22-24', bookSlug: 'ephesians', chapter: 5, startVerse: 22, endVerse: 24 },
  { id: 8, category: 'medium', reference: 'Philippians 4:6-7', bookSlug: 'philippians', chapter: 4, startVerse: 6, endVerse: 7 },
]

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

interface TestResult {
  id: number
  category: 'easy' | 'medium'
  reference: string
  verseText: string
  output: string
  model: string
  wordCount: number
  capturedAt: string
  errorMessage?: string
}

async function main() {
  const env = loadEnvLocal()
  const apiKey = env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY not found in frontend/.env.local. ' +
        'The BB-31 prompt test cannot run without a real API key.',
    )
  }

  console.log(
    `\n[BB-31] Starting prompt test run against real Gemini API.\n` +
      `Model: gemini-2.5-flash-lite\n` +
      `Passages: ${TEST_PASSAGES.length}\n` +
      `Key length: ${apiKey.length} chars\n`,
  )

  const ai = new GoogleGenAI({ apiKey })
  const results: TestResult[] = []

  for (const passage of TEST_PASSAGES) {
    const verseText = loadVerseRange(
      passage.bookSlug,
      passage.chapter,
      passage.startVerse,
      passage.endVerse,
    )
    console.log(`\n[${passage.id}/${TEST_PASSAGES.length}] ${passage.reference} (${passage.category})`)
    console.log(`    Verse text: ${verseText.slice(0, 80)}${verseText.length > 80 ? '…' : ''}`)

    const userPrompt = buildReflectPassageUserPrompt(passage.reference, verseText)

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: userPrompt,
        config: {
          systemInstruction: REFLECT_PASSAGE_SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 600,
          abortSignal: AbortSignal.timeout(30_000),
        },
      })

      const output = (response.text ?? '').trim()
      const wordCount = output.split(/\s+/).filter(Boolean).length
      results.push({
        id: passage.id,
        category: passage.category,
        reference: passage.reference,
        verseText,
        output,
        model: 'gemini-2.5-flash-lite',
        wordCount,
        capturedAt: new Date().toISOString(),
      })
      console.log(`    ✓ ${wordCount} words`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`    ✗ ERROR: ${msg}`)
      results.push({
        id: passage.id,
        category: passage.category,
        reference: passage.reference,
        verseText,
        output: '',
        model: 'gemini-2.5-flash-lite',
        wordCount: 0,
        capturedAt: new Date().toISOString(),
        errorMessage: msg,
      })
    }

    // Be polite to the API
    await new Promise((r) => setTimeout(r, 500))
  }

  // Write raw results to _plans/recon/
  const reconDir = resolve(FRONTEND_ROOT, '../_plans/recon')
  const rawPath = resolve(reconDir, 'bb31-prompt-tests.raw.json')
  writeFileSync(rawPath, JSON.stringify(results, null, 2))
  console.log(`\n✓ Raw results saved: ${rawPath}`)
  console.log(
    `\nSummary: ${results.filter((r) => !r.errorMessage).length}/${results.length} passages completed successfully\n`,
  )
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
