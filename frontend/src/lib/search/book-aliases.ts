import { BIBLE_BOOKS } from '@/constants/bible'

export interface BookAlias {
  slug: string
  chapters: number
}

interface BookDefinition {
  slug: string
  aliases: string[]
}

const BOOK_DEFINITIONS: BookDefinition[] = [
  // === OLD TESTAMENT ===

  // Pentateuch
  { slug: 'genesis', aliases: ['Genesis', 'Gen', 'Gn'] },
  { slug: 'exodus', aliases: ['Exodus', 'Ex', 'Exod'] },
  { slug: 'leviticus', aliases: ['Leviticus', 'Lev', 'Lv'] },
  { slug: 'numbers', aliases: ['Numbers', 'Num', 'Nm'] },
  { slug: 'deuteronomy', aliases: ['Deuteronomy', 'Deut', 'Dt'] },

  // Historical
  { slug: 'joshua', aliases: ['Joshua', 'Josh', 'Jos'] },
  { slug: 'judges', aliases: ['Judges', 'Judg', 'Jdg'] },
  { slug: 'ruth', aliases: ['Ruth', 'Rut', 'Rth'] },
  {
    slug: '1-samuel',
    aliases: ['1 Samuel', '1Samuel', '1 Sam', '1Sam', '1 Sm', '1Sm'],
  },
  {
    slug: '2-samuel',
    aliases: ['2 Samuel', '2Samuel', '2 Sam', '2Sam', '2 Sm', '2Sm'],
  },
  {
    slug: '1-kings',
    aliases: ['1 Kings', '1Kings', '1 Kgs', '1Kgs', '1 Ki', '1Ki'],
  },
  {
    slug: '2-kings',
    aliases: ['2 Kings', '2Kings', '2 Kgs', '2Kgs', '2 Ki', '2Ki'],
  },
  {
    slug: '1-chronicles',
    aliases: ['1 Chronicles', '1Chronicles', '1 Chr', '1Chr', '1 Chron', '1Chron'],
  },
  {
    slug: '2-chronicles',
    aliases: ['2 Chronicles', '2Chronicles', '2 Chr', '2Chr', '2 Chron', '2Chron'],
  },
  { slug: 'ezra', aliases: ['Ezra', 'Ezr'] },
  { slug: 'nehemiah', aliases: ['Nehemiah', 'Neh', 'Ne'] },
  { slug: 'esther', aliases: ['Esther', 'Esth', 'Est'] },

  // Wisdom & Poetry
  { slug: 'job', aliases: ['Job', 'Jb'] },
  { slug: 'psalms', aliases: ['Psalms', 'Psalm', 'Ps', 'Pss', 'Psa'] },
  { slug: 'proverbs', aliases: ['Proverbs', 'Prov', 'Prv', 'Pr'] },
  { slug: 'ecclesiastes', aliases: ['Ecclesiastes', 'Eccl', 'Eccles', 'Ec'] },
  {
    slug: 'song-of-solomon',
    aliases: [
      'Song of Solomon',
      'Song of Songs',
      'Song',
      'SoS',
      'Canticles',
      'Cant',
    ],
  },

  // Major Prophets
  { slug: 'isaiah', aliases: ['Isaiah', 'Isa', 'Is'] },
  { slug: 'jeremiah', aliases: ['Jeremiah', 'Jer', 'Jr'] },
  { slug: 'lamentations', aliases: ['Lamentations', 'Lam', 'Lm'] },
  { slug: 'ezekiel', aliases: ['Ezekiel', 'Ezek', 'Ezk'] },
  { slug: 'daniel', aliases: ['Daniel', 'Dan', 'Dn'] },

  // Minor Prophets
  { slug: 'hosea', aliases: ['Hosea', 'Hos'] },
  { slug: 'joel', aliases: ['Joel', 'Jl'] },
  { slug: 'amos', aliases: ['Amos', 'Am'] },
  { slug: 'obadiah', aliases: ['Obadiah', 'Obad', 'Ob'] },
  { slug: 'jonah', aliases: ['Jonah', 'Jon'] },
  { slug: 'micah', aliases: ['Micah', 'Mic', 'Mc'] },
  { slug: 'nahum', aliases: ['Nahum', 'Nah', 'Na'] },
  { slug: 'habakkuk', aliases: ['Habakkuk', 'Hab', 'Hb'] },
  { slug: 'zephaniah', aliases: ['Zephaniah', 'Zeph', 'Zep'] },
  { slug: 'haggai', aliases: ['Haggai', 'Hag', 'Hg'] },
  { slug: 'zechariah', aliases: ['Zechariah', 'Zech', 'Zec'] },
  { slug: 'malachi', aliases: ['Malachi', 'Mal'] },

  // === NEW TESTAMENT ===

  // Gospels
  { slug: 'matthew', aliases: ['Matthew', 'Matt', 'Mt'] },
  { slug: 'mark', aliases: ['Mark', 'Mk', 'Mrk'] },
  { slug: 'luke', aliases: ['Luke', 'Lk', 'Luk'] },
  { slug: 'john', aliases: ['John', 'Jn', 'Jhn'] },

  // History
  { slug: 'acts', aliases: ['Acts', 'Act', 'Ac'] },

  // Pauline Epistles
  { slug: 'romans', aliases: ['Romans', 'Rom', 'Rm'] },
  {
    slug: '1-corinthians',
    aliases: ['1 Corinthians', '1Corinthians', '1 Cor', '1Cor', '1 Co', '1Co'],
  },
  {
    slug: '2-corinthians',
    aliases: ['2 Corinthians', '2Corinthians', '2 Cor', '2Cor', '2 Co', '2Co'],
  },
  { slug: 'galatians', aliases: ['Galatians', 'Gal'] },
  { slug: 'ephesians', aliases: ['Ephesians', 'Eph'] },
  { slug: 'philippians', aliases: ['Philippians', 'Phil', 'Philip', 'Php'] },
  { slug: 'colossians', aliases: ['Colossians', 'Col'] },
  {
    slug: '1-thessalonians',
    aliases: [
      '1 Thessalonians',
      '1Thessalonians',
      '1 Thess',
      '1Thess',
      '1 Thes',
      '1Thes',
      '1 Th',
      '1Th',
    ],
  },
  {
    slug: '2-thessalonians',
    aliases: [
      '2 Thessalonians',
      '2Thessalonians',
      '2 Thess',
      '2Thess',
      '2 Thes',
      '2Thes',
      '2 Th',
      '2Th',
    ],
  },
  {
    slug: '1-timothy',
    aliases: ['1 Timothy', '1Timothy', '1 Tim', '1Tim', '1 Tm', '1Tm'],
  },
  {
    slug: '2-timothy',
    aliases: ['2 Timothy', '2Timothy', '2 Tim', '2Tim', '2 Tm', '2Tm'],
  },
  { slug: 'titus', aliases: ['Titus', 'Tit'] },
  { slug: 'philemon', aliases: ['Philemon', 'Phlm', 'Phlmn', 'Philem'] },
  { slug: 'hebrews', aliases: ['Hebrews', 'Heb'] },
  { slug: 'james', aliases: ['James', 'Jas', 'Jm'] },
  {
    slug: '1-peter',
    aliases: ['1 Peter', '1Peter', '1 Pet', '1Pet', '1 Pt', '1Pt'],
  },
  {
    slug: '2-peter',
    aliases: ['2 Peter', '2Peter', '2 Pet', '2Pet', '2 Pt', '2Pt'],
  },
  {
    slug: '1-john',
    aliases: ['1 John', '1John', '1 Jn', '1Jn', '1 Jhn', '1Jhn'],
  },
  {
    slug: '2-john',
    aliases: ['2 John', '2John', '2 Jn', '2Jn', '2 Jhn', '2Jhn'],
  },
  {
    slug: '3-john',
    aliases: ['3 John', '3John', '3 Jn', '3Jn', '3 Jhn', '3Jhn'],
  },
  { slug: 'jude', aliases: ['Jude', 'Jud'] },

  // Prophecy
  {
    slug: 'revelation',
    aliases: ['Revelation', 'Revelations', 'Rev', 'Rv', 'Re'],
  },
]

function buildAliasMap(): ReadonlyMap<string, BookAlias> {
  const chaptersBySlug = new Map<string, number>()
  for (const book of BIBLE_BOOKS) {
    chaptersBySlug.set(book.slug, book.chapters)
  }

  const map = new Map<string, BookAlias>()
  for (const def of BOOK_DEFINITIONS) {
    const chapters = chaptersBySlug.get(def.slug)
    if (chapters === undefined) {
      throw new Error(
        `book-aliases: slug "${def.slug}" is not present in BIBLE_BOOKS`,
      )
    }
    for (const alias of def.aliases) {
      const key = alias.toLowerCase()
      const existing = map.get(key)
      if (existing && existing.slug !== def.slug) {
        throw new Error(
          `book-aliases: alias "${alias}" collides — maps to both "${existing.slug}" and "${def.slug}"`,
        )
      }
      map.set(key, { slug: def.slug, chapters })
    }
  }

  if (BOOK_DEFINITIONS.length !== BIBLE_BOOKS.length) {
    throw new Error(
      `book-aliases: BOOK_DEFINITIONS has ${BOOK_DEFINITIONS.length} entries but BIBLE_BOOKS has ${BIBLE_BOOKS.length}`,
    )
  }

  return map
}

export const BOOK_ALIASES: ReadonlyMap<string, BookAlias> = buildAliasMap()

export const _BOOK_DEFINITIONS_INTERNAL: ReadonlyArray<BookDefinition> =
  BOOK_DEFINITIONS
