import { BIBLE_BOOKS } from '@/constants/bible'

export interface ParsedReference {
  text: string
  startIndex: number
  endIndex: number
  bookSlug: string
  bookName: string
  chapter: number
  startVerse?: number
  endVerse?: number
}

// Build lookup maps: name/abbreviation → { slug, displayName }
interface BookLookup {
  slug: string
  name: string
}

const ABBREVIATIONS: Record<string, string> = {
  Gen: 'Genesis',
  Ex: 'Exodus',
  Exod: 'Exodus',
  Lev: 'Leviticus',
  Num: 'Numbers',
  Deut: 'Deuteronomy',
  Josh: 'Joshua',
  Judg: 'Judges',
  Ps: 'Psalms',
  Psalm: 'Psalms',
  Prov: 'Proverbs',
  Eccl: 'Ecclesiastes',
  Isa: 'Isaiah',
  Jer: 'Jeremiah',
  Lam: 'Lamentations',
  Ezek: 'Ezekiel',
  Dan: 'Daniel',
  Hos: 'Hosea',
  Ob: 'Obadiah',
  Mic: 'Micah',
  Nah: 'Nahum',
  Hab: 'Habakkuk',
  Zeph: 'Zephaniah',
  Hag: 'Haggai',
  Zech: 'Zechariah',
  Mal: 'Malachi',
  Matt: 'Matthew',
  Mk: 'Mark',
  Lk: 'Luke',
  Jn: 'John',
  Rom: 'Romans',
  '1 Cor': '1 Corinthians',
  '2 Cor': '2 Corinthians',
  Gal: 'Galatians',
  Eph: 'Ephesians',
  Phil: 'Philippians',
  Col: 'Colossians',
  '1 Thess': '1 Thessalonians',
  '2 Thess': '2 Thessalonians',
  '1 Tim': '1 Timothy',
  '2 Tim': '2 Timothy',
  Heb: 'Hebrews',
  Jas: 'James',
  '1 Pet': '1 Peter',
  '2 Pet': '2 Peter',
  '1 Jn': '1 John',
  '2 Jn': '2 John',
  '3 Jn': '3 John',
  Rev: 'Revelation',
}

// Build the book lookup from BIBLE_BOOKS constant
const bookLookup = new Map<string, BookLookup>()

for (const book of BIBLE_BOOKS) {
  bookLookup.set(book.name.toLowerCase(), { slug: book.slug, name: book.name })
}

for (const [abbr, fullName] of Object.entries(ABBREVIATIONS)) {
  const book = BIBLE_BOOKS.find((b) => b.name === fullName)
  if (book) {
    bookLookup.set(abbr.toLowerCase(), { slug: book.slug, name: book.name })
  }
}

// Build regex alternation from all book names and abbreviations
// Sort by length descending so longer names match first (e.g. "1 Corinthians" before "1 Cor")
const allNames = [
  ...BIBLE_BOOKS.map((b) => b.name),
  ...Object.keys(ABBREVIATIONS),
]
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/\s+/g, '\\s+'))

const bookPattern = allNames.join('|')

// Full pattern: (BookName) (chapter)(?::(startVerse)(?:[-–](endVerse))?)?
// Requires at least chapter number after book name
// The book name must be preceded by a word boundary or start of string
// Uses [^\S\n] (whitespace except newline) to prevent matching across line breaks
const REFERENCE_REGEX = new RegExp(
  `(?:^|(?<=\\s|[("'\\[]))` +
    `(${bookPattern})` +
    `[^\\S\\n]+(\\d+)` +
    `(?::(\\d+)(?:[–\\-](\\d+))?)?` +
    `(?=$|[\\s,;.)!?'"\\]])`,
  'gi',
)

export function parseReferences(text: string): ParsedReference[] {
  const results: ParsedReference[] = []

  // Reset regex lastIndex for global matching
  REFERENCE_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = REFERENCE_REGEX.exec(text)) !== null) {
    const [fullMatch, bookStr, chapterStr, startVerseStr, endVerseStr] = match
    const startIndex = match.index

    // Check for time patterns: if followed by am/pm, skip
    const afterMatch = text.slice(startIndex + fullMatch.length)
    if (/^\s*(?:am|pm|a\.m\.|p\.m\.)/i.test(afterMatch)) {
      continue
    }

    // Resolve book name
    const lookupKey = bookStr.replace(/\s+/g, ' ').toLowerCase()
    const bookInfo = bookLookup.get(lookupKey)
    if (!bookInfo) continue

    const chapter = parseInt(chapterStr, 10)
    const startVerse = startVerseStr ? parseInt(startVerseStr, 10) : undefined
    const endVerse = endVerseStr ? parseInt(endVerseStr, 10) : undefined

    results.push({
      text: fullMatch,
      startIndex,
      endIndex: startIndex + fullMatch.length,
      bookSlug: bookInfo.slug,
      bookName: bookInfo.name,
      chapter,
      startVerse,
      endVerse,
    })
  }

  return results
}
