/**
 * BB-26 — Worship Room book slug → FCBH DBP book code mapping.
 *
 * The DBP v4 API identifies Bible books by a 3-letter code (`GEN`, `JHN`,
 * `REV`, etc.). Worship Room uses URL slugs (`genesis`, `john`, `revelation`).
 * This file maps between them.
 *
 * Verified against the live API in _plans/recon/bb26-audio-foundation.md § 7.
 * 100% match across all 66 books for both `EN1WEBN2DA` (NT) and
 * `EN1WEBO2DA` (OT) filesets.
 *
 * Also exports a testament check — OT books use `EN1WEBO2DA`, NT books
 * use `EN1WEBN2DA`. Both filesets are the ENGWWH ("WEB - Winfred Henson")
 * variant of the World English Bible, which is the only DBP fileset pair
 * with 100% 66-book audio coverage for WEB.
 */

/** Slug → DBP 3-letter code. */
export const FCBH_BOOK_CODES: Record<string, string> = {
  // OT (39 books)
  genesis: 'GEN',
  exodus: 'EXO',
  leviticus: 'LEV',
  numbers: 'NUM',
  deuteronomy: 'DEU',
  joshua: 'JOS',
  judges: 'JDG',
  ruth: 'RUT',
  '1-samuel': '1SA',
  '2-samuel': '2SA',
  '1-kings': '1KI',
  '2-kings': '2KI',
  '1-chronicles': '1CH',
  '2-chronicles': '2CH',
  ezra: 'EZR',
  nehemiah: 'NEH',
  esther: 'EST',
  job: 'JOB',
  psalms: 'PSA',
  proverbs: 'PRO',
  ecclesiastes: 'ECC',
  'song-of-solomon': 'SNG',
  isaiah: 'ISA',
  jeremiah: 'JER',
  lamentations: 'LAM',
  ezekiel: 'EZK',
  daniel: 'DAN',
  hosea: 'HOS',
  joel: 'JOL',
  amos: 'AMO',
  obadiah: 'OBA',
  jonah: 'JON',
  micah: 'MIC',
  nahum: 'NAM',
  habakkuk: 'HAB',
  zephaniah: 'ZEP',
  haggai: 'HAG',
  zechariah: 'ZEC',
  malachi: 'MAL',
  // NT (27 books)
  matthew: 'MAT',
  mark: 'MRK',
  luke: 'LUK',
  john: 'JHN',
  acts: 'ACT',
  romans: 'ROM',
  '1-corinthians': '1CO',
  '2-corinthians': '2CO',
  galatians: 'GAL',
  ephesians: 'EPH',
  philippians: 'PHP',
  colossians: 'COL',
  '1-thessalonians': '1TH',
  '2-thessalonians': '2TH',
  '1-timothy': '1TI',
  '2-timothy': '2TI',
  titus: 'TIT',
  philemon: 'PHM',
  hebrews: 'HEB',
  james: 'JAS',
  '1-peter': '1PE',
  '2-peter': '2PE',
  '1-john': '1JN',
  '2-john': '2JN',
  '3-john': '3JN',
  jude: 'JUD',
  revelation: 'REV',
}

/** Returns the DBP 3-letter code for a project slug, or null if unknown. */
export function resolveFcbhBookCode(slug: string): string | null {
  return FCBH_BOOK_CODES[slug] ?? null
}

const OT_SLUGS = new Set<string>([
  'genesis',
  'exodus',
  'leviticus',
  'numbers',
  'deuteronomy',
  'joshua',
  'judges',
  'ruth',
  '1-samuel',
  '2-samuel',
  '1-kings',
  '2-kings',
  '1-chronicles',
  '2-chronicles',
  'ezra',
  'nehemiah',
  'esther',
  'job',
  'psalms',
  'proverbs',
  'ecclesiastes',
  'song-of-solomon',
  'isaiah',
  'jeremiah',
  'lamentations',
  'ezekiel',
  'daniel',
  'hosea',
  'joel',
  'amos',
  'obadiah',
  'jonah',
  'micah',
  'nahum',
  'habakkuk',
  'zephaniah',
  'haggai',
  'zechariah',
  'malachi',
])

/** True for Old Testament book slugs, false for NT, false for unknown. */
export function isOldTestamentBook(slug: string): boolean {
  return OT_SLUGS.has(slug)
}

/** DBP fileset IDs for the WEB (ENGWWH variant) audio bible. */
export const FCBH_FILESET_OT = 'EN1WEBO2DA'
export const FCBH_FILESET_NT = 'EN1WEBN2DA'

/** Returns the fileset id for a book slug, or null if unknown. */
export function resolveFcbhFilesetForBook(slug: string): string | null {
  if (!FCBH_BOOK_CODES[slug]) return null
  return isOldTestamentBook(slug) ? FCBH_FILESET_OT : FCBH_FILESET_NT
}
