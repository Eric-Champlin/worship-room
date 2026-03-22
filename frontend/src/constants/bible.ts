import type { BibleBook, BibleCategory } from '@/types/bible'

export const BIBLE_PROGRESS_KEY = 'wr_bible_progress'

export const BIBLE_CATEGORIES: ReadonlyArray<{
  key: BibleCategory
  label: string
  testament: 'old' | 'new'
}> = [
  { key: 'pentateuch', label: 'Pentateuch', testament: 'old' },
  { key: 'historical', label: 'Historical', testament: 'old' },
  { key: 'wisdom-poetry', label: 'Wisdom & Poetry', testament: 'old' },
  { key: 'major-prophets', label: 'Major Prophets', testament: 'old' },
  { key: 'minor-prophets', label: 'Minor Prophets', testament: 'old' },
  { key: 'gospels', label: 'Gospels', testament: 'new' },
  { key: 'history', label: 'History', testament: 'new' },
  { key: 'pauline-epistles', label: 'Pauline Epistles', testament: 'new' },
  { key: 'general-epistles', label: 'General Epistles', testament: 'new' },
  { key: 'prophecy', label: 'Prophecy', testament: 'new' },
]

export const CATEGORY_LABELS: Record<BibleCategory, string> = {
  pentateuch: 'Pentateuch',
  historical: 'Historical',
  'wisdom-poetry': 'Wisdom & Poetry',
  'major-prophets': 'Major Prophets',
  'minor-prophets': 'Minor Prophets',
  gospels: 'Gospels',
  history: 'History',
  'pauline-epistles': 'Pauline Epistles',
  'general-epistles': 'General Epistles',
  prophecy: 'Prophecy',
}

export const BOOKS_WITH_FULL_TEXT = new Set([
  'genesis',
  'exodus',
  'psalms',
  'proverbs',
  'ecclesiastes',
  'isaiah',
  'jeremiah',
  'lamentations',
  'matthew',
  'mark',
  'luke',
  'john',
  'acts',
  'romans',
  '1-corinthians',
  '2-corinthians',
  'galatians',
  'ephesians',
  'philippians',
  'revelation',
])

export const BIBLE_BOOKS: BibleBook[] = [
  // === OLD TESTAMENT (39 books) ===

  // Pentateuch (5)
  { name: 'Genesis', slug: 'genesis', chapters: 50, testament: 'old', category: 'pentateuch', hasFullText: true },
  { name: 'Exodus', slug: 'exodus', chapters: 40, testament: 'old', category: 'pentateuch', hasFullText: true },
  { name: 'Leviticus', slug: 'leviticus', chapters: 27, testament: 'old', category: 'pentateuch', hasFullText: false },
  { name: 'Numbers', slug: 'numbers', chapters: 36, testament: 'old', category: 'pentateuch', hasFullText: false },
  { name: 'Deuteronomy', slug: 'deuteronomy', chapters: 34, testament: 'old', category: 'pentateuch', hasFullText: false },

  // Historical (12)
  { name: 'Joshua', slug: 'joshua', chapters: 24, testament: 'old', category: 'historical', hasFullText: false },
  { name: 'Judges', slug: 'judges', chapters: 21, testament: 'old', category: 'historical', hasFullText: false },
  { name: 'Ruth', slug: 'ruth', chapters: 4, testament: 'old', category: 'historical', hasFullText: false },
  { name: '1 Samuel', slug: '1-samuel', chapters: 31, testament: 'old', category: 'historical', hasFullText: false },
  { name: '2 Samuel', slug: '2-samuel', chapters: 24, testament: 'old', category: 'historical', hasFullText: false },
  { name: '1 Kings', slug: '1-kings', chapters: 22, testament: 'old', category: 'historical', hasFullText: false },
  { name: '2 Kings', slug: '2-kings', chapters: 25, testament: 'old', category: 'historical', hasFullText: false },
  { name: '1 Chronicles', slug: '1-chronicles', chapters: 29, testament: 'old', category: 'historical', hasFullText: false },
  { name: '2 Chronicles', slug: '2-chronicles', chapters: 36, testament: 'old', category: 'historical', hasFullText: false },
  { name: 'Ezra', slug: 'ezra', chapters: 10, testament: 'old', category: 'historical', hasFullText: false },
  { name: 'Nehemiah', slug: 'nehemiah', chapters: 13, testament: 'old', category: 'historical', hasFullText: false },
  { name: 'Esther', slug: 'esther', chapters: 10, testament: 'old', category: 'historical', hasFullText: false },

  // Wisdom & Poetry (5)
  { name: 'Job', slug: 'job', chapters: 42, testament: 'old', category: 'wisdom-poetry', hasFullText: false },
  { name: 'Psalms', slug: 'psalms', chapters: 150, testament: 'old', category: 'wisdom-poetry', hasFullText: true },
  { name: 'Proverbs', slug: 'proverbs', chapters: 31, testament: 'old', category: 'wisdom-poetry', hasFullText: true },
  { name: 'Ecclesiastes', slug: 'ecclesiastes', chapters: 12, testament: 'old', category: 'wisdom-poetry', hasFullText: true },
  { name: 'Song of Solomon', slug: 'song-of-solomon', chapters: 8, testament: 'old', category: 'wisdom-poetry', hasFullText: false },

  // Major Prophets (5)
  { name: 'Isaiah', slug: 'isaiah', chapters: 66, testament: 'old', category: 'major-prophets', hasFullText: true },
  { name: 'Jeremiah', slug: 'jeremiah', chapters: 52, testament: 'old', category: 'major-prophets', hasFullText: true },
  { name: 'Lamentations', slug: 'lamentations', chapters: 5, testament: 'old', category: 'major-prophets', hasFullText: true },
  { name: 'Ezekiel', slug: 'ezekiel', chapters: 48, testament: 'old', category: 'major-prophets', hasFullText: false },
  { name: 'Daniel', slug: 'daniel', chapters: 12, testament: 'old', category: 'major-prophets', hasFullText: false },

  // Minor Prophets (12)
  { name: 'Hosea', slug: 'hosea', chapters: 14, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Joel', slug: 'joel', chapters: 3, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Amos', slug: 'amos', chapters: 9, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Obadiah', slug: 'obadiah', chapters: 1, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Jonah', slug: 'jonah', chapters: 4, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Micah', slug: 'micah', chapters: 7, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Nahum', slug: 'nahum', chapters: 3, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Habakkuk', slug: 'habakkuk', chapters: 3, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Zephaniah', slug: 'zephaniah', chapters: 3, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Haggai', slug: 'haggai', chapters: 2, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Zechariah', slug: 'zechariah', chapters: 14, testament: 'old', category: 'minor-prophets', hasFullText: false },
  { name: 'Malachi', slug: 'malachi', chapters: 4, testament: 'old', category: 'minor-prophets', hasFullText: false },

  // === NEW TESTAMENT (27 books) ===

  // Gospels (4)
  { name: 'Matthew', slug: 'matthew', chapters: 28, testament: 'new', category: 'gospels', hasFullText: true },
  { name: 'Mark', slug: 'mark', chapters: 16, testament: 'new', category: 'gospels', hasFullText: true },
  { name: 'Luke', slug: 'luke', chapters: 24, testament: 'new', category: 'gospels', hasFullText: true },
  { name: 'John', slug: 'john', chapters: 21, testament: 'new', category: 'gospels', hasFullText: true },

  // History (1)
  { name: 'Acts', slug: 'acts', chapters: 28, testament: 'new', category: 'history', hasFullText: true },

  // Pauline Epistles (13)
  { name: 'Romans', slug: 'romans', chapters: 16, testament: 'new', category: 'pauline-epistles', hasFullText: true },
  { name: '1 Corinthians', slug: '1-corinthians', chapters: 16, testament: 'new', category: 'pauline-epistles', hasFullText: true },
  { name: '2 Corinthians', slug: '2-corinthians', chapters: 13, testament: 'new', category: 'pauline-epistles', hasFullText: true },
  { name: 'Galatians', slug: 'galatians', chapters: 6, testament: 'new', category: 'pauline-epistles', hasFullText: true },
  { name: 'Ephesians', slug: 'ephesians', chapters: 6, testament: 'new', category: 'pauline-epistles', hasFullText: true },
  { name: 'Philippians', slug: 'philippians', chapters: 4, testament: 'new', category: 'pauline-epistles', hasFullText: true },
  { name: 'Colossians', slug: 'colossians', chapters: 4, testament: 'new', category: 'pauline-epistles', hasFullText: false },
  { name: '1 Thessalonians', slug: '1-thessalonians', chapters: 5, testament: 'new', category: 'pauline-epistles', hasFullText: false },
  { name: '2 Thessalonians', slug: '2-thessalonians', chapters: 3, testament: 'new', category: 'pauline-epistles', hasFullText: false },
  { name: '1 Timothy', slug: '1-timothy', chapters: 6, testament: 'new', category: 'pauline-epistles', hasFullText: false },
  { name: '2 Timothy', slug: '2-timothy', chapters: 4, testament: 'new', category: 'pauline-epistles', hasFullText: false },
  { name: 'Titus', slug: 'titus', chapters: 3, testament: 'new', category: 'pauline-epistles', hasFullText: false },
  { name: 'Philemon', slug: 'philemon', chapters: 1, testament: 'new', category: 'pauline-epistles', hasFullText: false },

  // General Epistles (8)
  { name: 'Hebrews', slug: 'hebrews', chapters: 13, testament: 'new', category: 'general-epistles', hasFullText: false },
  { name: 'James', slug: 'james', chapters: 5, testament: 'new', category: 'general-epistles', hasFullText: false },
  { name: '1 Peter', slug: '1-peter', chapters: 5, testament: 'new', category: 'general-epistles', hasFullText: false },
  { name: '2 Peter', slug: '2-peter', chapters: 3, testament: 'new', category: 'general-epistles', hasFullText: false },
  { name: '1 John', slug: '1-john', chapters: 5, testament: 'new', category: 'general-epistles', hasFullText: false },
  { name: '2 John', slug: '2-john', chapters: 1, testament: 'new', category: 'general-epistles', hasFullText: false },
  { name: '3 John', slug: '3-john', chapters: 1, testament: 'new', category: 'general-epistles', hasFullText: false },
  { name: 'Jude', slug: 'jude', chapters: 1, testament: 'new', category: 'general-epistles', hasFullText: false },

  // Prophecy (1)
  { name: 'Revelation', slug: 'revelation', chapters: 22, testament: 'new', category: 'prophecy', hasFullText: true },
]
