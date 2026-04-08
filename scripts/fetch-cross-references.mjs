/**
 * fetch-cross-references.mjs
 *
 * One-off script to convert openbible.info TSK cross-reference data
 * into per-book JSON files for BB-9.
 *
 * Source: https://www.openbible.info/labs/cross-references/
 *         -> https://a.openbible.info/data/cross-references.zip
 *         -> cross_references.txt (tab-separated: From Verse | To Verse | Votes)
 *
 * References use OSIS format (e.g. Gen.1.1, 1Cor.13.4-1Cor.13.7).
 * Votes are integers — higher = stronger connection.
 * Rank mapping: votes >= 100 -> rank 1, 30-99 -> rank 2, 1-29 -> rank 3, <=0 -> rank 4.
 *
 * Output: frontend/src/data/bible/cross-references/<slug>.json
 *
 * Usage:
 *   node scripts/fetch-cross-references.mjs
 *
 * Requires the source file at /tmp/tsk-data/cross_references.txt
 * (download from https://a.openbible.info/data/cross-references.zip).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ---------------------------------------------------------------------------
// OSIS code -> bookMetadata.ts slug mapping (66 books)
// Slugs match exactly what's in frontend/src/constants/bookMetadata.ts
// ---------------------------------------------------------------------------

const OSIS_TO_SLUG = {
  Gen: 'genesis',
  Exod: 'exodus',
  Lev: 'leviticus',
  Num: 'numbers',
  Deut: 'deuteronomy',
  Josh: 'joshua',
  Judg: 'judges',
  Ruth: 'ruth',
  '1Sam': '1-samuel',
  '2Sam': '2-samuel',
  '1Kgs': '1-kings',
  '2Kgs': '2-kings',
  '1Chr': '1-chronicles',
  '2Chr': '2-chronicles',
  Ezra: 'ezra',
  Neh: 'nehemiah',
  Esth: 'esther',
  Job: 'job',
  Ps: 'psalms',
  Prov: 'proverbs',
  Eccl: 'ecclesiastes',
  Song: 'song-of-solomon',
  Isa: 'isaiah',
  Jer: 'jeremiah',
  Lam: 'lamentations',
  Ezek: 'ezekiel',
  Dan: 'daniel',
  Hos: 'hosea',
  Joel: 'joel',
  Amos: 'amos',
  Obad: 'obadiah',
  Jonah: 'jonah',
  Mic: 'micah',
  Nah: 'nahum',
  Hab: 'habakkuk',
  Zeph: 'zephaniah',
  Hag: 'haggai',
  Zech: 'zechariah',
  Mal: 'malachi',
  Matt: 'matthew',
  Mark: 'mark',
  Luke: 'luke',
  John: 'john',
  Acts: 'acts',
  Rom: 'romans',
  '1Cor': '1-corinthians',
  '2Cor': '2-corinthians',
  Gal: 'galatians',
  Eph: 'ephesians',
  Phil: 'philippians',
  Col: 'colossians',
  '1Thess': '1-thessalonians',
  '2Thess': '2-thessalonians',
  '1Tim': '1-timothy',
  '2Tim': '2-timothy',
  Titus: 'titus',
  Phlm: 'philemon',
  Heb: 'hebrews',
  Jas: 'james',
  '1Pet': '1-peter',
  '2Pet': '2-peter',
  '1John': '1-john',
  '2John': '2-john',
  '3John': '3-john',
  Jude: 'jude',
  Rev: 'revelation',
}

const SLUG_TO_NAME = {
  genesis: 'Genesis',
  exodus: 'Exodus',
  leviticus: 'Leviticus',
  numbers: 'Numbers',
  deuteronomy: 'Deuteronomy',
  joshua: 'Joshua',
  judges: 'Judges',
  ruth: 'Ruth',
  '1-samuel': '1 Samuel',
  '2-samuel': '2 Samuel',
  '1-kings': '1 Kings',
  '2-kings': '2 Kings',
  '1-chronicles': '1 Chronicles',
  '2-chronicles': '2 Chronicles',
  ezra: 'Ezra',
  nehemiah: 'Nehemiah',
  esther: 'Esther',
  job: 'Job',
  psalms: 'Psalms',
  proverbs: 'Proverbs',
  ecclesiastes: 'Ecclesiastes',
  'song-of-solomon': 'Song of Solomon',
  isaiah: 'Isaiah',
  jeremiah: 'Jeremiah',
  lamentations: 'Lamentations',
  ezekiel: 'Ezekiel',
  daniel: 'Daniel',
  hosea: 'Hosea',
  joel: 'Joel',
  amos: 'Amos',
  obadiah: 'Obadiah',
  jonah: 'Jonah',
  micah: 'Micah',
  nahum: 'Nahum',
  habakkuk: 'Habakkuk',
  zephaniah: 'Zephaniah',
  haggai: 'Haggai',
  zechariah: 'Zechariah',
  malachi: 'Malachi',
  matthew: 'Matthew',
  mark: 'Mark',
  luke: 'Luke',
  john: 'John',
  acts: 'Acts',
  romans: 'Romans',
  '1-corinthians': '1 Corinthians',
  '2-corinthians': '2 Corinthians',
  galatians: 'Galatians',
  ephesians: 'Ephesians',
  philippians: 'Philippians',
  colossians: 'Colossians',
  '1-thessalonians': '1 Thessalonians',
  '2-thessalonians': '2 Thessalonians',
  '1-timothy': '1 Timothy',
  '2-timothy': '2 Timothy',
  titus: 'Titus',
  philemon: 'Philemon',
  hebrews: 'Hebrews',
  james: 'James',
  '1-peter': '1 Peter',
  '2-peter': '2 Peter',
  '1-john': '1 John',
  '2-john': '2 John',
  '3-john': '3 John',
  jude: 'Jude',
  revelation: 'Revelation',
}

const VALID_SLUGS = new Set(Object.values(OSIS_TO_SLUG))

/**
 * Parse an OSIS reference like "Gen.1.1" or "1Cor.13.4-1Cor.13.7".
 * For ranges, takes the start verse only.
 */
function parseOsisRef(ref) {
  const startRef = ref.split('-')[0]
  const parts = startRef.split('.')
  if (parts.length < 3) return null

  const osisBook = parts[0]
  const chapter = parseInt(parts[1], 10)
  const verse = parseInt(parts[2], 10)

  if (!osisBook || isNaN(chapter) || isNaN(verse)) return null
  if (!OSIS_TO_SLUG[osisBook]) return null

  return { osisBook, chapter, verse }
}

/**
 * Convert votes to rank buckets.
 * Higher votes = stronger connection = lower rank number.
 */
function votesToRank(votes) {
  if (votes >= 100) return 1
  if (votes >= 30) return 2
  if (votes >= 1) return 3
  return 4
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const SOURCE_FILE = '/tmp/tsk-data/cross_references.txt'
const OUTPUT_DIR = join(__dirname, '..', 'frontend', 'src', 'data', 'bible', 'cross-references')

function main() {
  if (!existsSync(SOURCE_FILE)) {
    console.error(`Source file not found: ${SOURCE_FILE}`)
    console.error('Download from https://a.openbible.info/data/cross-references.zip')
    process.exit(1)
  }

  const raw = readFileSync(SOURCE_FILE, 'utf-8')
  const lines = raw.split('\n').filter((line) => line.trim() && !line.startsWith('From Verse'))

  console.log(`Parsing ${lines.length} cross-reference lines...`)

  // Group: { [sourceSlug]: { [chapter.verse]: Array<{ ref, rank }> } }
  const bookEntries = {}
  let parsed = 0
  let skipped = 0
  const unmappedBooks = new Set()

  for (const line of lines) {
    const [fromStr, toStr, votesStr] = line.split('\t')
    if (!fromStr || !toStr || votesStr === undefined) {
      skipped++
      continue
    }

    const from = parseOsisRef(fromStr)
    const to = parseOsisRef(toStr)

    if (!from) {
      const book = fromStr.split('.')[0]
      if (book && !OSIS_TO_SLUG[book]) unmappedBooks.add(book)
      skipped++
      continue
    }

    if (!to) {
      const book = toStr.split('-')[0].split('.')[0]
      if (book && !OSIS_TO_SLUG[book]) unmappedBooks.add(book)
      skipped++
      continue
    }

    const sourceSlug = OSIS_TO_SLUG[from.osisBook]
    const destSlug = OSIS_TO_SLUG[to.osisBook]
    const votes = parseInt(votesStr, 10)
    const rank = votesToRank(isNaN(votes) ? 0 : votes)

    const key = `${from.chapter}.${from.verse}`
    const ref = `${destSlug}.${to.chapter}.${to.verse}`

    if (!bookEntries[sourceSlug]) bookEntries[sourceSlug] = {}
    if (!bookEntries[sourceSlug][key]) bookEntries[sourceSlug][key] = []
    bookEntries[sourceSlug][key].push({ ref, rank })
    parsed++
  }

  console.log(`Parsed: ${parsed}, Skipped: ${skipped}`)
  if (unmappedBooks.size > 0) {
    console.error(`WARNING: Unmapped OSIS book codes: ${[...unmappedBooks].join(', ')}`)
    process.exit(1)
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })

  let filesWritten = 0
  let totalEntries = 0

  for (const slug of VALID_SLUGS) {
    const entries = bookEntries[slug] ?? {}

    // Sort ref arrays by rank ascending
    for (const key of Object.keys(entries)) {
      entries[key].sort((a, b) => a.rank - b.rank)
    }

    const output = {
      book: SLUG_TO_NAME[slug],
      slug,
      entries,
    }

    const filePath = join(OUTPUT_DIR, `${slug}.json`)
    writeFileSync(filePath, JSON.stringify(output, null, 2) + '\n')
    filesWritten++

    const entryCount = Object.keys(entries).length
    totalEntries += entryCount
    const refCount = Object.values(entries).reduce((sum, refs) => sum + refs.length, 0)
    console.log(`  ${slug}.json — ${entryCount} verses, ${refCount} refs`)
  }

  console.log(`\nWrote ${filesWritten} files to ${OUTPUT_DIR}`)
  console.log(`Total: ${totalEntries} source verses, ${parsed} cross-references`)

  // --- Validation ---
  console.log('\n--- Validation ---')

  let missingFiles = 0
  for (const slug of VALID_SLUGS) {
    if (!existsSync(join(OUTPUT_DIR, `${slug}.json`))) {
      console.error(`MISSING: ${slug}.json`)
      missingFiles++
    }
  }
  if (missingFiles > 0) {
    console.error(`${missingFiles} files missing!`)
    process.exit(1)
  }
  console.log('All 66 files present.')

  let errors = 0
  for (const slug of VALID_SLUGS) {
    const filePath = join(OUTPUT_DIR, `${slug}.json`)
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))

    if (data.slug !== slug) {
      console.error(`${slug}.json: slug mismatch (${data.slug})`)
      errors++
    }
    if (!data.book || typeof data.book !== 'string') {
      console.error(`${slug}.json: missing/invalid book field`)
      errors++
    }
    if (!data.entries || typeof data.entries !== 'object') {
      console.error(`${slug}.json: missing/invalid entries object`)
      errors++
    }

    for (const [key, refs] of Object.entries(data.entries)) {
      const keyParts = key.split('.')
      if (keyParts.length !== 2 || isNaN(Number(keyParts[0])) || isNaN(Number(keyParts[1]))) {
        console.error(`${slug}.json: invalid key "${key}"`)
        errors++
      }

      for (const entry of refs) {
        const refParts = entry.ref.split('.')
        if (refParts.length < 3) {
          console.error(`${slug}.json: invalid ref "${entry.ref}" in ${key}`)
          errors++
          continue
        }
        // Destination slug may contain hyphens, so rejoin all parts except last two
        const refSegments = entry.ref.split('.')
        const destVerse = parseInt(refSegments.pop(), 10)
        const destChapter = parseInt(refSegments.pop(), 10)
        const destSlug = refSegments.join('.')
        if (!VALID_SLUGS.has(destSlug)) {
          console.error(`${slug}.json: unknown dest slug "${destSlug}" in ref "${entry.ref}"`)
          errors++
        }
        if (isNaN(destChapter) || isNaN(destVerse)) {
          console.error(`${slug}.json: invalid chapter/verse in ref "${entry.ref}"`)
          errors++
        }
        if (typeof entry.rank !== 'number' || entry.rank < 1) {
          console.error(`${slug}.json: invalid rank ${entry.rank} in ref "${entry.ref}"`)
          errors++
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} validation errors found!`)
    process.exit(1)
  }
  console.log('All files pass structural validation.')

  // --- Spot Checks ---
  console.log('\n--- Spot Checks ---')
  spotCheck('john', '3.16', ['romans', '1-john', 'john'])
  spotCheck('romans', '8.28', ['genesis', 'ephesians'])
  spotCheck('psalms', '23.1', ['isaiah', 'john'])
  spotCheck('isaiah', '53.5', ['1-peter', 'romans'])
}

function spotCheck(bookSlug, verseKey, expectedDestSlugs) {
  const filePath = join(OUTPUT_DIR, `${bookSlug}.json`)
  const data = JSON.parse(readFileSync(filePath, 'utf-8'))
  const refs = data.entries[verseKey]

  if (!refs || refs.length === 0) {
    console.error(`  FAIL: ${bookSlug} ${verseKey} — no cross-references found`)
    return
  }

  const destSlugs = refs.map((r) => {
    const parts = r.ref.split('.')
    parts.pop() // verse
    parts.pop() // chapter
    return parts.join('.')
  })
  const found = expectedDestSlugs.filter((s) => destSlugs.includes(s))
  const missing = expectedDestSlugs.filter((s) => !destSlugs.includes(s))

  console.log(
    `  ${bookSlug} ${verseKey}: ${refs.length} refs. Found expected: [${found.join(', ')}]${missing.length ? ` Missing: [${missing.join(', ')}]` : ''}`
  )
}

main()
