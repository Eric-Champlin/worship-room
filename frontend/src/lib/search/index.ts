export { tokenize, tokenizeWithPositions, stem, STOPWORDS } from './tokenizer'
export {
  loadSearchIndex,
  searchBible,
  isIndexLoaded,
  loadVerseTexts,
  applyProximityBonus,
  _resetIndexCache,
} from './engine'
export type { SearchIndex, SearchOptions, SearchResult, VerseRef } from './types'
export { parseReference } from './reference-parser'
export type { ParsedReference } from './reference-parser'
