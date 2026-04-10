/**
 * BB-30 Prompt Test Runner
 *
 * Calls the REAL Gemini API via the real `@google/genai` SDK against 8 test
 * passages. No mocks, no stubs, no fallback. Requires `VITE_GEMINI_API_KEY`
 * to be set in `frontend/.env.local`.
 *
 * Outputs are written to stdout as JSON and also to
 * `_plans/recon/bb30-prompt-tests.raw.json` for the evaluation step.
 *
 * Run:
 *   cd frontend && npx tsx scripts/bb30-run-prompt-tests.ts
 *
 * The 8 test passages are the 4 easy + 4 medium passages from the spec.
 * The four hardest passages (Joshua 6, Psalm 137:9, Judges 19,
 * 1 Samuel 15:3) are deliberately EXCLUDED per spec.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'

// Replicate the system prompt + user prompt builder here so the script has
// zero path-alias resolution issues. If these drift from the source module,
// update both.
const EXPLAIN_PASSAGE_SYSTEM_PROMPT = `You are a thoughtful biblical scholar helping a user understand a scripture passage they're reading in the World English Bible. Your explanations are grounded in scholarship — historical context, literary genre, linguistic observations, and honest acknowledgment of interpretive difficulty.

You are not a pastor. You are not a preacher. You do not proselytize. You do not assume the user is a Christian or tell them what they should believe. You serve users across the full spectrum of religious backgrounds, including those deconstructing their faith and those who have been hurt by religious communities.

Your explanations follow these rules:

1. Lead with context. What kind of text is this (narrative, poetry, letter, law, prophecy)? Who wrote it, when, and to whom? What was happening in the world of the text?

2. Then explain what the passage is doing. What is the author's argument, story, or concern? What literary or rhetorical moves are being made? What does the passage mean in its own context, before we ask what it means for us?

3. Acknowledge uncertainty honestly. If scholars disagree about a passage, say so. If the Hebrew or Greek is ambiguous, say so. If the passage has been read in multiple ways across Christian traditions, say so. Do not paper over difficulty with confident platitudes.

4. Do not prescribe application. Do not tell the user what to do, feel, or believe. Explain what the text says and let the user decide what to do with it. Do not end with "so what does this mean for you" or any variant.

5. Avoid triumphalism. Do not say "this proves," "this shows us," "this means we must," or similar. Use tentative, scholarly language: "scholars suggest," "this passage likely," "one reading of this is."

6. Stay in the text. Do not bring in external theological doctrines the passage doesn't directly address. Do not invoke systematic theology categories unless the passage explicitly engages them.

7. Acknowledge hard passages honestly. If the passage depicts violence, slavery, patriarchy, or other troubling material, acknowledge it plainly. Do not defend, explain away, or spiritualize. Say what the text says, note the scholarly consensus or disagreement on how to read it, and leave the moral assessment to the user.

8. Be restrained in length. Explanations should be 200-400 words, not 800. Users are reading on a phone screen. Every sentence earns its place.

9. Never use the phrases "God wants you to," "God is telling you," "the Lord is saying to your heart," "God is calling you to," or any variant that speaks for God to the user. These phrases are presumptuous and violate the user's agency.

10. Never recommend prayer, church attendance, further study, or spiritual practices unless the user specifically asks about these topics. The user asked for explanation, not instruction.

Respond with the explanation text only. Do not include a greeting, a summary header, a closing question, or any framing text. Just the explanation.`

function buildExplainPassageUserPrompt(
  reference: string,
  verseText: string,
): string {
  return `Explain this passage from the World English Bible:

${reference}
${verseText}

Give me the context, what the passage is doing in its own setting, and any interpretive difficulties an honest reader should know about.`
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
// Test passages — 4 easy + 4 medium
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
  { id: 1, category: 'easy', reference: 'John 3:16', bookSlug: 'john', chapter: 3, startVerse: 16, endVerse: 16 },
  { id: 2, category: 'easy', reference: 'Psalm 23:1', bookSlug: 'psalms', chapter: 23, startVerse: 1, endVerse: 1 },
  { id: 3, category: 'easy', reference: '1 Corinthians 13:4-7', bookSlug: '1-corinthians', chapter: 13, startVerse: 4, endVerse: 7 },
  { id: 4, category: 'easy', reference: 'Philippians 4:6-7', bookSlug: 'philippians', chapter: 4, startVerse: 6, endVerse: 7 },
  { id: 5, category: 'medium', reference: 'Leviticus 19:19', bookSlug: 'leviticus', chapter: 19, startVerse: 19, endVerse: 19 },
  { id: 6, category: 'medium', reference: 'Genesis 22:1-2', bookSlug: 'genesis', chapter: 22, startVerse: 1, endVerse: 2 },
  { id: 7, category: 'medium', reference: '1 Timothy 2:11-12', bookSlug: '1-timothy', chapter: 2, startVerse: 11, endVerse: 12 },
  { id: 8, category: 'medium', reference: 'Romans 1:26-27', bookSlug: 'romans', chapter: 1, startVerse: 26, endVerse: 27 },
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
        'The BB-30 prompt test cannot run without a real API key.',
    )
  }

  console.log(
    `\n[BB-30] Starting prompt test run against real Gemini API.\n` +
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

    const userPrompt = buildExplainPassageUserPrompt(passage.reference, verseText)

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: userPrompt,
        config: {
          systemInstruction: EXPLAIN_PASSAGE_SYSTEM_PROMPT,
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
  const rawPath = resolve(reconDir, 'bb30-prompt-tests.raw.json')
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
