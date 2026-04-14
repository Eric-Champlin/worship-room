/**
 * BB-42: Tokenization module for Bible full-text search.
 *
 * Pure TypeScript — no React, no browser APIs. Used by both:
 * - Build-time index generator (Node.js script)
 * - Runtime search engine (browser)
 */

export const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'of', 'to', 'in', 'that', 'is', 'was',
  'for', 'with', 'as', 'his', 'he', 'be', 'this', 'from', 'or', 'had',
  'by', 'it', 'not', 'but', 'are', 'at', 'have', 'were', 'which', 'their',
])

/**
 * Light stemmer: strips common English suffixes when the resulting stem
 * is at least 4 characters. Rule order: most specific suffix first.
 *
 * NOT a full Porter stemmer — intentionally limited to avoid over-stemming
 * common Bible words (e.g. "loving" must NOT become "lov").
 */
export function stem(word: string): string {
  if (word.endsWith('ness') && word.length - 4 >= 4) return word.slice(0, -4)
  if (word.endsWith('ing') && word.length - 3 >= 4) return word.slice(0, -3)
  if (word.endsWith('ed') && word.length - 2 >= 4) return word.slice(0, -2)
  if (word.endsWith('ly') && word.length - 2 >= 4) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length - 1 >= 4) return word.slice(0, -1)
  return word
}

/**
 * Tokenize text into a deduplicated array of stemmed, non-stopword tokens.
 *
 * Pipeline:
 * 1. Lowercase
 * 2. Split on non-alphanumeric/apostrophe characters
 * 3. Strip leading/trailing apostrophes
 * 4. Remove empty tokens
 * 5. Filter stopwords
 * 6. Stem each token
 * 7. Deduplicate
 */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
  const raw = lower.split(/[^a-z0-9']+/)
  const seen = new Set<string>()
  const result: string[] = []

  for (const rawToken of raw) {
    // Strip leading/trailing apostrophes
    let cleaned = rawToken.replace(/^'+|'+$/g, '')
    if (cleaned === '') continue
    // Strip possessive 's (e.g. "god's" → "god") but preserve contractions
    // like "don't". Possessive = ends with 's after stripping.
    if (cleaned.endsWith("'s")) {
      cleaned = cleaned.slice(0, -2)
    }
    if (cleaned === '') continue
    if (STOPWORDS.has(cleaned)) continue

    const stemmed = stem(cleaned)
    if (!seen.has(stemmed)) {
      seen.add(stemmed)
      result.push(stemmed)
    }
  }

  return result
}

/**
 * Tokenize text preserving position information for proximity scoring.
 * Returns an array of [token, position] tuples where position is the
 * word index in the original text (after splitting, before stopword removal).
 */
export function tokenizeWithPositions(text: string): Array<[string, number]> {
  const lower = text.toLowerCase()
  const raw = lower.split(/[^a-z0-9']+/)
  const result: Array<[string, number]> = []

  for (let i = 0; i < raw.length; i++) {
    let cleaned = raw[i].replace(/^'+|'+$/g, '')
    if (cleaned === '') continue
    if (cleaned.endsWith("'s")) {
      cleaned = cleaned.slice(0, -2)
    }
    if (cleaned === '') continue
    if (STOPWORDS.has(cleaned)) continue

    const stemmed = stem(cleaned)
    result.push([stemmed, i])
  }

  return result
}
