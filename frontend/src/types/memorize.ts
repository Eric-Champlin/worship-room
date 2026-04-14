export interface MemorizationCard {
  id: string
  book: string
  bookName: string
  chapter: number
  startVerse: number
  endVerse: number
  verseText: string
  reference: string
  createdAt: number
  lastReviewedAt: number | null
  reviewCount: number
}
