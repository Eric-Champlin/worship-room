import { BIBLE_BOOKS } from './bible'
import type { BibleCategory } from '@/types/bible'

export interface BookMetadata {
  slug: string
  name: string
  testament: 'OT' | 'NT'
  category: BibleCategory
  chapterCount: number
  wordCount: number
  abbreviations: string[]
  drawerCategoryLabel: string
}

/** Maps category keys to drawer display labels per BB-2 spec */
export const DRAWER_CATEGORY_LABELS: Record<BibleCategory, string> = {
  pentateuch: 'Law',
  historical: 'History',
  'wisdom-poetry': 'Wisdom & Poetry',
  'major-prophets': 'Major Prophets',
  'minor-prophets': 'Minor Prophets',
  gospels: 'Gospels',
  history: 'History',
  'pauline-epistles': 'Pauline Epistles',
  'general-epistles': 'General Epistles',
  prophecy: 'Apocalyptic',
}

/** Category display order for Old Testament */
export const OT_CATEGORIES: BibleCategory[] = [
  'pentateuch',
  'historical',
  'wisdom-poetry',
  'major-prophets',
  'minor-prophets',
]

/** Category display order for New Testament */
export const NT_CATEGORIES: BibleCategory[] = [
  'gospels',
  'history',
  'pauline-epistles',
  'general-epistles',
  'prophecy',
]

/** Word counts extracted from WEB JSON files. Overrides for 5 single-chapter books with incomplete JSON data. */
const WORD_COUNTS: Record<string, number> = {
  genesis: 35827,
  exodus: 30926,
  leviticus: 23493,
  numbers: 31264,
  deuteronomy: 27351,
  joshua: 17835,
  judges: 17922,
  ruth: 2436,
  '1-samuel': 23638,
  '2-samuel': 19447,
  '1-kings': 23067,
  '2-kings': 22226,
  '1-chronicles': 19221,
  '2-chronicles': 24702,
  ezra: 7120,
  nehemiah: 10057,
  esther: 5408,
  job: 17670,
  psalms: 40731,
  proverbs: 14533,
  ecclesiastes: 5481,
  'song-of-solomon': 2553,
  isaiah: 35557,
  jeremiah: 41136,
  lamentations: 3388,
  ezekiel: 37668,
  daniel: 11282,
  hosea: 5049,
  joel: 1934,
  amos: 4047,
  obadiah: 670,
  jonah: 1272,
  micah: 2958,
  nahum: 1201,
  habakkuk: 1375,
  zephaniah: 1553,
  haggai: 1050,
  zechariah: 6050,
  malachi: 1710,
  matthew: 22831,
  mark: 14261,
  luke: 24399,
  john: 18692,
  acts: 23143,
  romans: 9431,
  '1-corinthians': 9342,
  '2-corinthians': 6069,
  galatians: 3118,
  ephesians: 3082,
  philippians: 2219,
  colossians: 1991,
  '1-thessalonians': 1834,
  '2-thessalonians': 1036,
  '1-timothy': 2267,
  '2-timothy': 1611,
  titus: 904,
  philemon: 335,
  hebrews: 6873,
  james: 2250,
  '1-peter': 2416,
  '2-peter': 1516,
  '1-john': 2453,
  '2-john': 245,
  '3-john': 219,
  jude: 461,
  revelation: 11380,
}

/** Common abbreviations for Bible book search */
const ABBREVIATIONS: Record<string, string[]> = {
  genesis: ['gen', 'ge'],
  exodus: ['exod', 'ex'],
  leviticus: ['lev', 'le'],
  numbers: ['num', 'nu'],
  deuteronomy: ['deut', 'de', 'dt'],
  joshua: ['josh', 'jos'],
  judges: ['judg', 'jdg'],
  ruth: ['ru'],
  '1-samuel': ['1sam', '1sa'],
  '2-samuel': ['2sam', '2sa'],
  '1-kings': ['1ki', '1kgs'],
  '2-kings': ['2ki', '2kgs'],
  '1-chronicles': ['1chr', '1ch'],
  '2-chronicles': ['2chr', '2ch'],
  ezra: ['ezr'],
  nehemiah: ['neh', 'ne'],
  esther: ['est', 'esth'],
  job: ['jb'],
  psalms: ['ps', 'psa', 'psalm'],
  proverbs: ['prov', 'pr'],
  ecclesiastes: ['eccl', 'ecc', 'ec'],
  'song-of-solomon': ['song', 'sos', 'canticles', 'sg'],
  isaiah: ['isa', 'is'],
  jeremiah: ['jer', 'je'],
  lamentations: ['lam', 'la'],
  ezekiel: ['ezek', 'eze'],
  daniel: ['dan', 'da'],
  hosea: ['hos', 'ho'],
  joel: ['joe'],
  amos: ['am'],
  obadiah: ['obad', 'ob'],
  jonah: ['jon'],
  micah: ['mic', 'mi'],
  nahum: ['nah', 'na'],
  habakkuk: ['hab'],
  zephaniah: ['zeph', 'zep'],
  haggai: ['hag'],
  zechariah: ['zech', 'zec'],
  malachi: ['mal'],
  matthew: ['matt', 'mt'],
  mark: ['mk', 'mr'],
  luke: ['lk', 'lu'],
  john: ['jn', 'joh'],
  acts: ['ac'],
  romans: ['rom', 'ro'],
  '1-corinthians': ['1cor', '1co'],
  '2-corinthians': ['2cor', '2co'],
  galatians: ['gal', 'ga'],
  ephesians: ['eph'],
  philippians: ['phil', 'php'],
  colossians: ['col'],
  '1-thessalonians': ['1thess', '1th'],
  '2-thessalonians': ['2thess', '2th'],
  '1-timothy': ['1tim', '1ti'],
  '2-timothy': ['2tim', '2ti'],
  titus: ['tit'],
  philemon: ['phlm', 'phm'],
  hebrews: ['heb'],
  james: ['jas', 'jm'],
  '1-peter': ['1pet', '1pe'],
  '2-peter': ['2pet', '2pe'],
  '1-john': ['1jn', '1jo'],
  '2-john': ['2jn', '2jo'],
  '3-john': ['3jn', '3jo'],
  jude: ['jud'],
  revelation: ['rev', 'apocalypse', 're'],
}

/** All 66 books with full metadata for the Bible section */
export const BOOK_METADATA: BookMetadata[] = BIBLE_BOOKS.map((book) => ({
  slug: book.slug,
  name: book.name,
  testament: book.testament === 'old' ? 'OT' : 'NT',
  category: book.category,
  chapterCount: book.chapters,
  wordCount: WORD_COUNTS[book.slug] ?? 0,
  abbreviations: ABBREVIATIONS[book.slug] ?? [],
  drawerCategoryLabel: DRAWER_CATEGORY_LABELS[book.category],
}))

/**
 * Format a reading time in minutes to a human-friendly string.
 * < 60 min → "~30 min"
 * ≥ 60 min → "~2 hr 30 min" (omits minutes part if 0)
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const hr = Math.floor(minutes / 60)
  const min = minutes % 60
  if (min === 0) return `~${hr} hr`
  return `~${hr} hr ${min} min`
}

/** Calculate reading time in minutes at 200 wpm */
export function getReadingTimeMinutes(wordCount: number): number {
  return Math.ceil(wordCount / 200)
}
