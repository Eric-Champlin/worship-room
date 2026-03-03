export type LocalSupportCategory = 'churches' | 'counselors' | 'celebrate-recovery'

export interface LocalSupportPlace {
  id: string
  name: string
  address: string
  phone: string | null
  website: string | null
  lat: number
  lng: number
  rating: number | null
  photoUrl: string | null
  description: string | null
  hoursOfOperation: string[] | null
  category: LocalSupportCategory
  denomination: string | null
  specialties: string[] | null
}

export interface SearchParams {
  lat: number
  lng: number
  radius: number
  keyword: string
}

export interface SearchResult {
  places: LocalSupportPlace[]
  hasMore: boolean
}

export type SortOption = 'distance' | 'rating' | 'alphabetical'

export const DENOMINATION_OPTIONS = [
  'Baptist', 'Methodist', 'Non-denominational', 'Catholic',
  'Presbyterian', 'Lutheran', 'Pentecostal', 'Episcopal',
  'Church of Christ', 'Other',
] as const

export const SPECIALTY_OPTIONS = [
  'Grief', 'Anxiety', 'Depression', 'Addiction',
  'Marriage', 'Trauma', 'Family', 'General',
] as const
