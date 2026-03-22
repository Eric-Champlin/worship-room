import { BIBLE_BOOKS } from '@/constants/bible'
import type { BibleBook, BibleCategory, BibleChapter } from '@/types/bible'

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
  genesis: () => import('./books/genesis').then((m) => m.genesisChapters),
  exodus: () => import('./books/exodus').then((m) => m.exodusChapters),
  psalms: () => import('./books/psalms').then((m) => m.psalmsChapters),
  proverbs: () => import('./books/proverbs').then((m) => m.proverbsChapters),
  ecclesiastes: () => import('./books/ecclesiastes').then((m) => m.ecclesiastesChapters),
  isaiah: () => import('./books/isaiah').then((m) => m.isaiahChapters),
  jeremiah: () => import('./books/jeremiah').then((m) => m.jeremiahChapters),
  lamentations: () => import('./books/lamentations').then((m) => m.lamentationsChapters),
  matthew: () => import('./books/matthew').then((m) => m.matthewChapters),
  mark: () => import('./books/mark').then((m) => m.markChapters),
  luke: () => import('./books/luke').then((m) => m.lukeChapters),
  john: () => import('./books/john').then((m) => m.johnChapters),
  acts: () => import('./books/acts').then((m) => m.actsChapters),
  romans: () => import('./books/romans').then((m) => m.romansChapters),
  '1-corinthians': () => import('./books/1-corinthians').then((m) => m.corinthians1Chapters),
  '2-corinthians': () => import('./books/2-corinthians').then((m) => m.corinthians2Chapters),
  galatians: () => import('./books/galatians').then((m) => m.galatiansChapters),
  ephesians: () => import('./books/ephesians').then((m) => m.ephesiansChapters),
  philippians: () => import('./books/philippians').then((m) => m.philippiansChapters),
  revelation: () => import('./books/revelation').then((m) => m.revelationChapters),
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
  } catch {
    return null
  }
}

export async function loadAllBookText(
  bookSlug: string,
): Promise<BibleChapter[]> {
  const loader = BOOK_LOADERS[bookSlug]
  if (!loader) return []

  try {
    return await loader()
  } catch {
    return []
  }
}

export function getBibleGatewayUrl(bookName: string, chapter: number): string {
  const encodedBook = encodeURIComponent(bookName)
  return `https://www.biblegateway.com/passage/?search=${encodedBook}+${chapter}&version=WEB`
}
