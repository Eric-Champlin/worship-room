/**
 * Generate sitemap.xml for Worship Room
 *
 * Includes all public routes + all 1,189 Bible chapter URLs.
 * Run: npx tsx frontend/scripts/generate-sitemap.ts
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE_URL = 'https://worshiproom.com'
const TODAY = new Date().toISOString().split('T')[0]

// Bible books data (copied from constants/bible.ts to avoid TS path alias issues)
const BIBLE_BOOKS = [
  { slug: 'genesis', chapters: 50 },
  { slug: 'exodus', chapters: 40 },
  { slug: 'leviticus', chapters: 27 },
  { slug: 'numbers', chapters: 36 },
  { slug: 'deuteronomy', chapters: 34 },
  { slug: 'joshua', chapters: 24 },
  { slug: 'judges', chapters: 21 },
  { slug: 'ruth', chapters: 4 },
  { slug: '1-samuel', chapters: 31 },
  { slug: '2-samuel', chapters: 24 },
  { slug: '1-kings', chapters: 22 },
  { slug: '2-kings', chapters: 25 },
  { slug: '1-chronicles', chapters: 29 },
  { slug: '2-chronicles', chapters: 36 },
  { slug: 'ezra', chapters: 10 },
  { slug: 'nehemiah', chapters: 13 },
  { slug: 'esther', chapters: 10 },
  { slug: 'job', chapters: 42 },
  { slug: 'psalms', chapters: 150 },
  { slug: 'proverbs', chapters: 31 },
  { slug: 'ecclesiastes', chapters: 12 },
  { slug: 'song-of-solomon', chapters: 8 },
  { slug: 'isaiah', chapters: 66 },
  { slug: 'jeremiah', chapters: 52 },
  { slug: 'lamentations', chapters: 5 },
  { slug: 'ezekiel', chapters: 48 },
  { slug: 'daniel', chapters: 12 },
  { slug: 'hosea', chapters: 14 },
  { slug: 'joel', chapters: 3 },
  { slug: 'amos', chapters: 9 },
  { slug: 'obadiah', chapters: 1 },
  { slug: 'jonah', chapters: 4 },
  { slug: 'micah', chapters: 7 },
  { slug: 'nahum', chapters: 3 },
  { slug: 'habakkuk', chapters: 3 },
  { slug: 'zephaniah', chapters: 3 },
  { slug: 'haggai', chapters: 2 },
  { slug: 'zechariah', chapters: 14 },
  { slug: 'malachi', chapters: 4 },
  { slug: 'matthew', chapters: 28 },
  { slug: 'mark', chapters: 16 },
  { slug: 'luke', chapters: 24 },
  { slug: 'john', chapters: 21 },
  { slug: 'acts', chapters: 28 },
  { slug: 'romans', chapters: 16 },
  { slug: '1-corinthians', chapters: 16 },
  { slug: '2-corinthians', chapters: 13 },
  { slug: 'galatians', chapters: 6 },
  { slug: 'ephesians', chapters: 6 },
  { slug: 'philippians', chapters: 4 },
  { slug: 'colossians', chapters: 4 },
  { slug: '1-thessalonians', chapters: 5 },
  { slug: '2-thessalonians', chapters: 3 },
  { slug: '1-timothy', chapters: 6 },
  { slug: '2-timothy', chapters: 4 },
  { slug: 'titus', chapters: 3 },
  { slug: 'philemon', chapters: 1 },
  { slug: 'hebrews', chapters: 13 },
  { slug: 'james', chapters: 5 },
  { slug: '1-peter', chapters: 5 },
  { slug: '2-peter', chapters: 3 },
  { slug: '1-john', chapters: 5 },
  { slug: '2-john', chapters: 1 },
  { slug: '3-john', chapters: 1 },
  { slug: 'jude', chapters: 1 },
  { slug: 'revelation', chapters: 22 },
]

interface SitemapEntry {
  loc: string
  priority: number
  changefreq: string
}

const STATIC_ROUTES: SitemapEntry[] = [
  { loc: '/', priority: 1.0, changefreq: 'daily' },
  { loc: '/daily', priority: 0.9, changefreq: 'daily' },
  { loc: '/prayer-wall', priority: 0.8, changefreq: 'daily' },
  { loc: '/devotional', priority: 0.8, changefreq: 'daily' },
  { loc: '/music', priority: 0.7, changefreq: 'weekly' },
  { loc: '/bible', priority: 0.8, changefreq: 'monthly' },
  { loc: '/ask', priority: 0.7, changefreq: 'monthly' },
  { loc: '/reading-plans', priority: 0.7, changefreq: 'weekly' },
  { loc: '/challenges', priority: 0.7, changefreq: 'weekly' },
  { loc: '/local-support/churches', priority: 0.6, changefreq: 'monthly' },
  { loc: '/local-support/counselors', priority: 0.6, changefreq: 'monthly' },
  { loc: '/local-support/celebrate-recovery', priority: 0.6, changefreq: 'monthly' },
  { loc: '/music/routines', priority: 0.5, changefreq: 'monthly' },
]

function generateBibleEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = []
  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      entries.push({
        loc: `/bible/${book.slug}/${ch}`,
        priority: 0.6,
        changefreq: 'monthly',
      })
    }
  }
  return entries
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${BASE_URL}${e.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

// Generate
const allEntries = [...STATIC_ROUTES, ...generateBibleEntries()]
const xml = buildSitemapXml(allEntries)

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(__dirname, '../public/sitemap.xml')
writeFileSync(outputPath, xml, 'utf-8')

console.log(`Sitemap generated: ${outputPath}`)
console.log(`Total URLs: ${allEntries.length} (${STATIC_ROUTES.length} static + ${allEntries.length - STATIC_ROUTES.length} Bible chapters)`)
