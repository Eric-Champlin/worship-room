# BB-42: Bible Search Index Reference

**Generated:** 2026-04-13
**Source data:** 66 WEB Bible JSON files from `frontend/src/data/bible/web/`
**Output:** `frontend/public/search/bible-index.json`
**Regenerate:** `pnpm --filter frontend run build-search-index`

---

## Index Format

```typescript
interface SearchIndex {
  version: 1                           // Bump to invalidate cached indexes
  generatedAt: string                  // ISO 8601 timestamp
  totalVerses: number                  // Total verses indexed
  tokens: Record<string, VerseRef[]>   // Inverted index
}

type VerseRef = [string, number, number]  // [bookSlug, chapter, verse]
```

## Size Measurements

| Metric | Value |
|--------|-------|
| Raw JSON | 7.21 MB |
| Gzipped | 1.31 MB |
| Unique tokens | 9,437 |
| Total verse references | 425,376 |
| Total verses indexed | 31,098 |
| Verdict | Within 2 MB gzipped budget — no splitting needed |

## Tokenization Rules

### Stopword List (30 words)

```
the, a, an, and, of, to, in, that, is, was,
for, with, as, his, he, be, this, from, or, had,
by, it, not, but, are, at, have, were, which, their
```

### Stemming Function

Light stemmer — strips common suffixes when stem is ≥4 characters:

| Suffix | Example | Result | Stem length |
|--------|---------|--------|-------------|
| `-ness` | darkness | dark | 4 |
| `-ing` | praying | pray | 4 |
| `-ed` | called | call | 4 |
| `-ly` | boldly | bold | 4 |
| `-s` (not `-ss`) | prayers | prayer | 6 |

**Minimum stem length = 4 characters.** Words where stemming would produce <4 chars are left unchanged:
- "loved" → "loved" (stem "lov" = 3 chars)
- "was" → "was" (stem "" too short)
- "bless" → "bless" (ends in -ss, excluded)
- "loving" → "loving" (stem "lov" = 3 chars)

### Tokenization Pipeline

1. Lowercase
2. Split on non-alphanumeric/apostrophe: `/[^a-z0-9']+/`
3. Strip leading/trailing apostrophes
4. Strip possessive `'s` (e.g. "God's" → "god")
5. Remove empty tokens
6. Filter stopwords
7. Apply stem function
8. Deduplicate per verse (index building only)

## Scoring Function

| Factor | Weight | Condition |
|--------|--------|-----------|
| Base score | +1 per token | All query tokens matched (AND) |
| Proximity bonus | +2 | All query tokens within 5 word positions |
| Recency bonus | +1 | Book slug in user's `wr_bible_progress` |
| Length penalty | -0.5 | Verse text > 200 characters |

**Tiebreaker:** Canonical book order (Genesis → Revelation), then chapter ascending, then verse ascending.

## PWA Precaching

The index is precached via `vite-plugin-pwa` using `globPatterns: ['search/*.json']` in `vite.config.ts`. After the first visit, search works fully offline.

## Deferred Follow-ups

- **Phrase search** — quoted exact phrases like `"God so loved the world"`
- **Fuzzy matching** — typo tolerance
- **Filters by testament, book, or genre**
- **Search history and saved searches**
- **Suggestions / autocomplete**
- **Cross-reference search** (BB-0 cross-reference data)
- **Analytics on search queries**
