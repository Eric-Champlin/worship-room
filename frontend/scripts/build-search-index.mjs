/**
 * BB-42: Build-time inverted index generator for Bible full-text search.
 *
 * Reads all 66 WEB Bible JSON files, tokenizes verse text, builds an inverted
 * index mapping tokens → [bookSlug, chapter, verse] tuples, and writes the
 * result to frontend/public/search/bible-index.json.
 *
 * Usage: pnpm --filter frontend run build-search-index
 *        (or: npx tsx scripts/build-search-index.mjs)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

// Import the shared tokenizer (tsx handles TS imports)
import { tokenize } from '../src/lib/search/tokenizer.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BIBLE_DIR = join(__dirname, '..', 'src', 'data', 'bible', 'web')
const OUTPUT_DIR = join(__dirname, '..', 'public', 'search')
const OUTPUT_FILE = join(OUTPUT_DIR, 'bible-index.json')

// Book slugs in canonical order (Genesis → Revelation)
const BOOK_SLUGS = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', 'ruth', '1-samuel', '2-samuel',
  '1-kings', '2-kings', '1-chronicles', '2-chronicles', 'ezra',
  'nehemiah', 'esther', 'job', 'psalms', 'proverbs',
  'ecclesiastes', 'song-of-solomon', 'isaiah', 'jeremiah', 'lamentations',
  'ezekiel', 'daniel', 'hosea', 'joel', 'amos',
  'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
  'zephaniah', 'haggai', 'zechariah', 'malachi',
  'matthew', 'mark', 'luke', 'john', 'acts',
  'romans', '1-corinthians', '2-corinthians', 'galatians', 'ephesians',
  'philippians', 'colossians', '1-thessalonians', '2-thessalonians',
  '1-timothy', '2-timothy', 'titus', 'philemon', 'hebrews',
  'james', '1-peter', '2-peter', '1-john', '2-john',
  '3-john', 'jude', 'revelation',
]

function buildIndex() {
  console.log('Building Bible search index...\n')

  /** @type {Record<string, Array<[string, number, number]>>} */
  const tokens = {}
  let totalVerses = 0
  let booksProcessed = 0

  for (const slug of BOOK_SLUGS) {
    const filePath = join(BIBLE_DIR, `${slug}.json`)
    let bookData

    try {
      const raw = readFileSync(filePath, 'utf-8')
      bookData = JSON.parse(raw)
    } catch (err) {
      console.error(`  [SKIP] ${slug}: ${err.message}`)
      continue
    }

    for (const chapter of bookData.chapters) {
      for (const verse of chapter.verses) {
        if (!verse.text || verse.text.trim() === '') continue

        totalVerses++

        const verseTokens = tokenize(verse.text)
        const ref = [slug, chapter.number, verse.number]

        for (const token of verseTokens) {
          if (!tokens[token]) {
            tokens[token] = []
          }
          tokens[token].push(ref)
        }
      }
    }

    booksProcessed++
    if (booksProcessed % 10 === 0) {
      console.log(`  Processed ${booksProcessed}/66 books...`)
    }
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalVerses,
    tokens,
  }

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const jsonStr = JSON.stringify(index)
  writeFileSync(OUTPUT_FILE, jsonStr, 'utf-8')

  // Measure sizes
  const rawBytes = Buffer.byteLength(jsonStr, 'utf-8')
  const gzipped = gzipSync(Buffer.from(jsonStr))
  const gzipBytes = gzipped.length

  const uniqueTokens = Object.keys(tokens).length
  const totalRefs = Object.values(tokens).reduce((sum, refs) => sum + refs.length, 0)

  console.log('\n--- Bible Search Index Stats ---')
  console.log(`Books processed:  ${booksProcessed}`)
  console.log(`Total verses:     ${totalVerses}`)
  console.log(`Unique tokens:    ${uniqueTokens}`)
  console.log(`Total references: ${totalRefs}`)
  console.log(`Raw size:         ${(rawBytes / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Gzipped size:     ${(gzipBytes / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Output:           ${OUTPUT_FILE}`)

  if (gzipBytes > 2 * 1024 * 1024) {
    console.log('\n⚠️  WARNING: Gzipped size exceeds 2 MB. Consider splitting by testament.')
  } else {
    console.log('\n✅ Index size is within the 2 MB gzipped budget.')
  }
}

buildIndex()
