/** A single day's reading activity for the heatmap */
export interface DailyActivity {
  date: string // YYYY-MM-DD
  chapterCount: number // total unique chapters read/visited
  chapters: Array<{ book: string; chapter: number }> // detail for tooltip
}

/** Intensity level for heatmap cell coloring (5-state scale) */
export type HeatmapIntensity = 0 | 1 | 2 | 3 | 4

/** A single book's coverage for the progress map */
export interface BookCoverage {
  name: string // display name, e.g. "Genesis"
  slug: string // URL slug, e.g. "genesis"
  testament: 'old' | 'new'
  totalChapters: number
  readChapters: Set<number> // chapter numbers that have been read
  highlightedChapters: Set<number> // chapter numbers with at least one highlight
}

/** Chapter state in the progress map (3-state scale) */
export type ChapterState = 'unread' | 'read' | 'highlighted'

/** Raw shape of wr_chapters_visited in localStorage */
export type ChapterVisitStore = Record<string, Array<{ book: string; chapter: number }>>
