#!/usr/bin/env node
/**
 * Fetches the WEB (World English Bible) JSON data from benkaiser/webbe-json
 * and writes one JSON file per book to frontend/src/data/bible/books/json/<slug>.json
 *
 * Each file is a BibleChapter[] matching the app's type definition:
 *   { bookSlug: string; chapter: number; verses: { number: number; text: string }[] }[]
 *
 * Source: https://github.com/benkaiser/webbe-json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '../src/data/bible/books/json')

// All 66 books: slug → { bookKey (webbe-json naming), chapterCount }
// webbe-json uses lowercase no-hyphens naming (e.g. "1samuel", "songofsolomon")
const BOOKS = [
  { slug: 'genesis', key: 'genesis', chapters: 50 },
  { slug: 'exodus', key: 'exodus', chapters: 40 },
  { slug: 'leviticus', key: 'leviticus', chapters: 27 },
  { slug: 'numbers', key: 'numbers', chapters: 36 },
  { slug: 'deuteronomy', key: 'deuteronomy', chapters: 34 },
  { slug: 'joshua', key: 'joshua', chapters: 24 },
  { slug: 'judges', key: 'judges', chapters: 21 },
  { slug: 'ruth', key: 'ruth', chapters: 4 },
  { slug: '1-samuel', key: '1samuel', chapters: 31 },
  { slug: '2-samuel', key: '2samuel', chapters: 24 },
  { slug: '1-kings', key: '1kings', chapters: 22 },
  { slug: '2-kings', key: '2kings', chapters: 25 },
  { slug: '1-chronicles', key: '1chronicles', chapters: 29 },
  { slug: '2-chronicles', key: '2chronicles', chapters: 36 },
  { slug: 'ezra', key: 'ezra', chapters: 10 },
  { slug: 'nehemiah', key: 'nehemiah', chapters: 13 },
  { slug: 'esther', key: 'esther', chapters: 10 },
  { slug: 'job', key: 'job', chapters: 42 },
  { slug: 'psalms', key: 'psalms', chapters: 150 },
  { slug: 'proverbs', key: 'proverbs', chapters: 31 },
  { slug: 'ecclesiastes', key: 'ecclesiastes', chapters: 12 },
  { slug: 'song-of-solomon', key: 'songofsolomon', chapters: 8 },
  { slug: 'isaiah', key: 'isaiah', chapters: 66 },
  { slug: 'jeremiah', key: 'jeremiah', chapters: 52 },
  { slug: 'lamentations', key: 'lamentations', chapters: 5 },
  { slug: 'ezekiel', key: 'ezekiel', chapters: 48 },
  { slug: 'daniel', key: 'daniel', chapters: 12 },
  { slug: 'hosea', key: 'hosea', chapters: 14 },
  { slug: 'joel', key: 'joel', chapters: 3 },
  { slug: 'amos', key: 'amos', chapters: 9 },
  { slug: 'obadiah', key: 'obadiah', chapters: 1 },
  { slug: 'jonah', key: 'jonah', chapters: 4 },
  { slug: 'micah', key: 'micah', chapters: 7 },
  { slug: 'nahum', key: 'nahum', chapters: 3 },
  { slug: 'habakkuk', key: 'habakkuk', chapters: 3 },
  { slug: 'zephaniah', key: 'zephaniah', chapters: 3 },
  { slug: 'haggai', key: 'haggai', chapters: 2 },
  { slug: 'zechariah', key: 'zechariah', chapters: 14 },
  { slug: 'malachi', key: 'malachi', chapters: 4 },
  { slug: 'matthew', key: 'matthew', chapters: 28 },
  { slug: 'mark', key: 'mark', chapters: 16 },
  { slug: 'luke', key: 'luke', chapters: 24 },
  { slug: 'john', key: 'john', chapters: 21 },
  { slug: 'acts', key: 'acts', chapters: 28 },
  { slug: 'romans', key: 'romans', chapters: 16 },
  { slug: '1-corinthians', key: '1corinthians', chapters: 16 },
  { slug: '2-corinthians', key: '2corinthians', chapters: 13 },
  { slug: 'galatians', key: 'galatians', chapters: 6 },
  { slug: 'ephesians', key: 'ephesians', chapters: 6 },
  { slug: 'philippians', key: 'philippians', chapters: 4 },
  { slug: 'colossians', key: 'colossians', chapters: 4 },
  { slug: '1-thessalonians', key: '1thessalonians', chapters: 5 },
  { slug: '2-thessalonians', key: '2thessalonians', chapters: 3 },
  { slug: '1-timothy', key: '1timothy', chapters: 6 },
  { slug: '2-timothy', key: '2timothy', chapters: 4 },
  { slug: 'titus', key: 'titus', chapters: 3 },
  { slug: 'philemon', key: 'philemon', chapters: 1 },
  { slug: 'hebrews', key: 'hebrews', chapters: 13 },
  { slug: 'james', key: 'james', chapters: 5 },
  { slug: '1-peter', key: '1peter', chapters: 5 },
  { slug: '2-peter', key: '2peter', chapters: 3 },
  { slug: '1-john', key: '1john', chapters: 5 },
  { slug: '2-john', key: '2john', chapters: 1 },
  { slug: '3-john', key: '3john', chapters: 1 },
  { slug: 'jude', key: 'jude', chapters: 1 },
  { slug: 'revelation', key: 'revelation', chapters: 22 },
]

const BASE_URL =
  'https://raw.githubusercontent.com/benkaiser/webbe-json/master/data'

// Fetch with retry
async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
      return await res.json()
    } catch (err) {
      if (attempt === retries) throw err
      const delay = attempt * 1000
      console.warn(`  Retry ${attempt}/${retries} after ${delay}ms for ${url}`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

// Fetch all chapters for a book in parallel (batches of 10)
async function fetchBook(book) {
  const chapterNums = Array.from({ length: book.chapters }, (_, i) => i + 1)
  const bibleChapters = []

  // Process in batches of 10 to avoid overwhelming the server
  for (let i = 0; i < chapterNums.length; i += 10) {
    const batch = chapterNums.slice(i, i + 10)
    const results = await Promise.all(
      batch.map(async (chNum) => {
        const url = `${BASE_URL}/${book.key}${chNum}.json`
        const data = await fetchWithRetry(url)
        const verses = data.verses.map((v) => ({
          number: v.verse,
          text: v.text.replace(/\n/g, ' ').trim(),
        }))
        return { bookSlug: book.slug, chapter: chNum, verses }
      }),
    )
    bibleChapters.push(...results)
  }

  return bibleChapters.sort((a, b) => a.chapter - b.chapter)
}

async function main() {
  console.log('Fetching WEB Bible data from benkaiser/webbe-json...')
  console.log(`Writing to: ${OUTPUT_DIR}`)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  let written = 0
  let errors = []

  for (const book of BOOKS) {
    process.stdout.write(`  Fetching ${book.slug} (${book.chapters} chapters)... `)
    try {
      const chapters = await fetchBook(book)
      const outputPath = path.join(OUTPUT_DIR, `${book.slug}.json`)
      fs.writeFileSync(outputPath, JSON.stringify(chapters, null, 2), 'utf-8')
      console.log(`OK (${chapters.length} chapters)`)
      written++
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
      errors.push({ slug: book.slug, error: err.message })
    }
  }

  console.log(`\nDone! Wrote ${written}/66 books.`)
  if (errors.length > 0) {
    console.warn('Errors:')
    errors.forEach((e) => console.warn(`  ${e.slug}: ${e.error}`))
    process.exit(1)
  } else {
    console.log('All 66 books written successfully.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
