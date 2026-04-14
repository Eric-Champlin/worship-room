import { BIBLE_BOOKS } from '@/constants/bible'
import type { BibleBook, BibleCategory, BibleChapter, BibleVerse } from '@/types/bible'

// --- BB-4 WEB JSON format types and loaders ---

interface WebBookJson {
  book: string
  slug: string
  testament: string
  chapters: Array<{
    number: number
    verses: BibleVerse[]
    paragraphs: number[]
  }>
}

type WebBookLoader = () => Promise<WebBookJson>

// Dynamic import map for the web/ JSON files — one lazy loader per book slug
const WEB_BOOK_LOADERS: Record<string, WebBookLoader> = Object.fromEntries(
  BIBLE_BOOKS.map((b) => [
    b.slug,
    () => import(`./web/${b.slug}.json`).then((m) => m.default as WebBookJson),
  ]),
)

export async function loadChapterWeb(
  bookSlug: string,
  chapter: number,
): Promise<BibleChapter | null> {
  const loader = WEB_BOOK_LOADERS[bookSlug]
  if (!loader) return null

  try {
    const bookData = await loader()
    const ch = bookData.chapters.find((c) => c.number === chapter)
    if (!ch) return null

    return {
      bookSlug,
      chapter,
      verses: ch.verses.filter((v) => v.text.trim() !== ''),
      paragraphs: ch.paragraphs,
    }
  } catch {
    return null
  }
}

export function getAdjacentChapter(
  bookSlug: string,
  chapter: number,
  direction: 'prev' | 'next',
): { bookSlug: string; bookName: string; chapter: number } | null {
  const bookIndex = BIBLE_BOOKS.findIndex((b) => b.slug === bookSlug)
  if (bookIndex === -1) return null

  const currentBook = BIBLE_BOOKS[bookIndex]

  if (direction === 'next') {
    if (chapter < currentBook.chapters) {
      return { bookSlug, bookName: currentBook.name, chapter: chapter + 1 }
    }
    // Cross-book: go to next book, chapter 1
    const nextBook = BIBLE_BOOKS[bookIndex + 1]
    if (!nextBook) return null // Revelation last chapter
    return { bookSlug: nextBook.slug, bookName: nextBook.name, chapter: 1 }
  } else {
    if (chapter > 1) {
      return { bookSlug, bookName: currentBook.name, chapter: chapter - 1 }
    }
    // Cross-book: go to previous book, last chapter
    const prevBook = BIBLE_BOOKS[bookIndex - 1]
    if (!prevBook) return null // Genesis chapter 1
    return { bookSlug: prevBook.slug, bookName: prevBook.name, chapter: prevBook.chapters }
  }
}

export function getBookBySlug(slug: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.slug === slug)
}

export function getBooksByTestament(testament: 'old' | 'new'): BibleBook[] {
  return BIBLE_BOOKS.filter((b) => b.testament === testament)
}

export function getBooksByCategory(category: BibleCategory): BibleBook[] {
  return BIBLE_BOOKS.filter((b) => b.category === category)
}

type BookLoader = () => Promise<BibleChapter[]>

const BOOK_LOADERS: Record<string, BookLoader> = {
  genesis: () => import('./books/json/genesis.json').then((m) => m.default as BibleChapter[]),
  exodus: () => import('./books/json/exodus.json').then((m) => m.default as BibleChapter[]),
  leviticus: () => import('./books/json/leviticus.json').then((m) => m.default as BibleChapter[]),
  numbers: () => import('./books/json/numbers.json').then((m) => m.default as BibleChapter[]),
  deuteronomy: () =>
    import('./books/json/deuteronomy.json').then((m) => m.default as BibleChapter[]),
  joshua: () => import('./books/json/joshua.json').then((m) => m.default as BibleChapter[]),
  judges: () => import('./books/json/judges.json').then((m) => m.default as BibleChapter[]),
  ruth: () => import('./books/json/ruth.json').then((m) => m.default as BibleChapter[]),
  '1-samuel': () => import('./books/json/1-samuel.json').then((m) => m.default as BibleChapter[]),
  '2-samuel': () => import('./books/json/2-samuel.json').then((m) => m.default as BibleChapter[]),
  '1-kings': () => import('./books/json/1-kings.json').then((m) => m.default as BibleChapter[]),
  '2-kings': () => import('./books/json/2-kings.json').then((m) => m.default as BibleChapter[]),
  '1-chronicles': () =>
    import('./books/json/1-chronicles.json').then((m) => m.default as BibleChapter[]),
  '2-chronicles': () =>
    import('./books/json/2-chronicles.json').then((m) => m.default as BibleChapter[]),
  ezra: () => import('./books/json/ezra.json').then((m) => m.default as BibleChapter[]),
  nehemiah: () => import('./books/json/nehemiah.json').then((m) => m.default as BibleChapter[]),
  esther: () => import('./books/json/esther.json').then((m) => m.default as BibleChapter[]),
  job: () => import('./books/json/job.json').then((m) => m.default as BibleChapter[]),
  psalms: () => import('./books/json/psalms.json').then((m) => m.default as BibleChapter[]),
  proverbs: () => import('./books/json/proverbs.json').then((m) => m.default as BibleChapter[]),
  ecclesiastes: () =>
    import('./books/json/ecclesiastes.json').then((m) => m.default as BibleChapter[]),
  'song-of-solomon': () =>
    import('./books/json/song-of-solomon.json').then((m) => m.default as BibleChapter[]),
  isaiah: () => import('./books/json/isaiah.json').then((m) => m.default as BibleChapter[]),
  jeremiah: () => import('./books/json/jeremiah.json').then((m) => m.default as BibleChapter[]),
  lamentations: () =>
    import('./books/json/lamentations.json').then((m) => m.default as BibleChapter[]),
  ezekiel: () => import('./books/json/ezekiel.json').then((m) => m.default as BibleChapter[]),
  daniel: () => import('./books/json/daniel.json').then((m) => m.default as BibleChapter[]),
  hosea: () => import('./books/json/hosea.json').then((m) => m.default as BibleChapter[]),
  joel: () => import('./books/json/joel.json').then((m) => m.default as BibleChapter[]),
  amos: () => import('./books/json/amos.json').then((m) => m.default as BibleChapter[]),
  obadiah: () => import('./books/json/obadiah.json').then((m) => m.default as BibleChapter[]),
  jonah: () => import('./books/json/jonah.json').then((m) => m.default as BibleChapter[]),
  micah: () => import('./books/json/micah.json').then((m) => m.default as BibleChapter[]),
  nahum: () => import('./books/json/nahum.json').then((m) => m.default as BibleChapter[]),
  habakkuk: () => import('./books/json/habakkuk.json').then((m) => m.default as BibleChapter[]),
  zephaniah: () => import('./books/json/zephaniah.json').then((m) => m.default as BibleChapter[]),
  haggai: () => import('./books/json/haggai.json').then((m) => m.default as BibleChapter[]),
  zechariah: () => import('./books/json/zechariah.json').then((m) => m.default as BibleChapter[]),
  malachi: () => import('./books/json/malachi.json').then((m) => m.default as BibleChapter[]),
  matthew: () => import('./books/json/matthew.json').then((m) => m.default as BibleChapter[]),
  mark: () => import('./books/json/mark.json').then((m) => m.default as BibleChapter[]),
  luke: () => import('./books/json/luke.json').then((m) => m.default as BibleChapter[]),
  john: () => import('./books/json/john.json').then((m) => m.default as BibleChapter[]),
  acts: () => import('./books/json/acts.json').then((m) => m.default as BibleChapter[]),
  romans: () => import('./books/json/romans.json').then((m) => m.default as BibleChapter[]),
  '1-corinthians': () =>
    import('./books/json/1-corinthians.json').then((m) => m.default as BibleChapter[]),
  '2-corinthians': () =>
    import('./books/json/2-corinthians.json').then((m) => m.default as BibleChapter[]),
  galatians: () => import('./books/json/galatians.json').then((m) => m.default as BibleChapter[]),
  ephesians: () => import('./books/json/ephesians.json').then((m) => m.default as BibleChapter[]),
  philippians: () =>
    import('./books/json/philippians.json').then((m) => m.default as BibleChapter[]),
  colossians: () =>
    import('./books/json/colossians.json').then((m) => m.default as BibleChapter[]),
  '1-thessalonians': () =>
    import('./books/json/1-thessalonians.json').then((m) => m.default as BibleChapter[]),
  '2-thessalonians': () =>
    import('./books/json/2-thessalonians.json').then((m) => m.default as BibleChapter[]),
  '1-timothy': () =>
    import('./books/json/1-timothy.json').then((m) => m.default as BibleChapter[]),
  '2-timothy': () =>
    import('./books/json/2-timothy.json').then((m) => m.default as BibleChapter[]),
  titus: () => import('./books/json/titus.json').then((m) => m.default as BibleChapter[]),
  philemon: () => import('./books/json/philemon.json').then((m) => m.default as BibleChapter[]),
  hebrews: () => import('./books/json/hebrews.json').then((m) => m.default as BibleChapter[]),
  james: () => import('./books/json/james.json').then((m) => m.default as BibleChapter[]),
  '1-peter': () => import('./books/json/1-peter.json').then((m) => m.default as BibleChapter[]),
  '2-peter': () => import('./books/json/2-peter.json').then((m) => m.default as BibleChapter[]),
  '1-john': () => import('./books/json/1-john.json').then((m) => m.default as BibleChapter[]),
  '2-john': () => import('./books/json/2-john.json').then((m) => m.default as BibleChapter[]),
  '3-john': () => import('./books/json/3-john.json').then((m) => m.default as BibleChapter[]),
  jude: () => import('./books/json/jude.json').then((m) => m.default as BibleChapter[]),
  revelation: () =>
    import('./books/json/revelation.json').then((m) => m.default as BibleChapter[]),
}

export async function loadChapter(
  bookSlug: string,
  chapter: number,
): Promise<BibleChapter | null> {
  const loader = BOOK_LOADERS[bookSlug]
  if (!loader) return null

  try {
    const chapters = await loader()
    return chapters.find((c) => c.chapter === chapter) ?? null
  } catch (_e) {
    return null
  }
}

export async function loadAllBookText(bookSlug: string): Promise<BibleChapter[]> {
  const loader = BOOK_LOADERS[bookSlug]
  if (!loader) return []

  try {
    return await loader()
  } catch (_e) {
    return []
  }
}

export function getBibleGatewayUrl(bookName: string, chapter: number): string {
  const encodedBook = encodeURIComponent(bookName)
  return `https://www.biblegateway.com/passage/?search=${encodedBook}+${chapter}&version=WEB`
}
