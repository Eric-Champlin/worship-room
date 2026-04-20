import type { LocalSupportCategory, LocalSupportPlace } from '@/types/local-support'
import { DENOMINATION_OPTIONS, SPECIALTY_OPTIONS } from '@/types/local-support'

export interface GooglePlace {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  location: { latitude: number; longitude: number }
  rating?: number
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>
  editorialSummary?: { text: string; languageCode?: string }
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  types?: string[]
  businessStatus?:
    | 'BUSINESS_STATUS_UNSPECIFIED'
    | 'OPERATIONAL'
    | 'CLOSED_TEMPORARILY'
    | 'CLOSED_PERMANENTLY'
}

export function buildPhotoUrl(photoName: string, apiKey: string, maxWidthPx = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(apiKey)}`
}

export function inferDenomination(name: string, description: string | null): string | null {
  const haystack = `${name} ${description ?? ''}`.toLowerCase()
  const patterns: Array<[string, string]> = [
    ['Church of Christ', 'church of christ'],
    ['Non-denominational', 'non-denominational'],
    ['Non-denominational', 'nondenominational'],
    ['Baptist', 'baptist'],
    ['Catholic', 'catholic'],
    ['Methodist', 'methodist'],
    ['Presbyterian', 'presbyterian'],
    ['Lutheran', 'lutheran'],
    ['Pentecostal', 'pentecostal'],
    ['Episcopal', 'episcopal'],
  ]
  for (const [canonical, pattern] of patterns) {
    if (haystack.includes(pattern)) {
      if ((DENOMINATION_OPTIONS as readonly string[]).includes(canonical)) {
        return canonical
      }
    }
  }
  return null
}

export function inferSpecialties(name: string, description: string | null): string[] | null {
  const haystack = `${name} ${description ?? ''}`.toLowerCase()
  const matches: string[] = []
  const patterns: Array<[string, RegExp]> = [
    ['Grief', /\b(grief|bereavement|loss)\b/],
    ['Anxiety', /\banxiet/],
    ['Depression', /\bdepress/],
    ['Addiction', /\b(addict|substance|recovery|sobriety)\b/],
    ['Marriage', /\b(marriag|couples?|marital)\b/],
    ['Trauma', /\btrauma\b/],
    ['Family', /\bfamil/],
  ]
  for (const [canonical, pattern] of patterns) {
    if (pattern.test(haystack)) {
      if ((SPECIALTY_OPTIONS as readonly string[]).includes(canonical)) {
        matches.push(canonical)
      }
    }
  }
  if (matches.length === 0) return ['General']
  return matches.slice(0, 3)
}

export function mapGooglePlaceToLocalSupport(
  gp: GooglePlace,
  category: LocalSupportCategory,
  apiKey: string,
): LocalSupportPlace | null {
  if (!gp.displayName?.text || !gp.location) return null
  if (gp.businessStatus === 'CLOSED_PERMANENTLY') return null

  const name = gp.displayName.text
  const description = gp.editorialSummary?.text ?? null
  const photoUrl = gp.photos?.[0]?.name ? buildPhotoUrl(gp.photos[0].name, apiKey) : null
  const denomination = category === 'churches' ? inferDenomination(name, description) : null
  const specialties = category === 'counselors' ? inferSpecialties(name, description) : null

  return {
    id: gp.id,
    name,
    address: gp.formattedAddress ?? 'Address unavailable',
    phone: gp.nationalPhoneNumber ?? gp.internationalPhoneNumber ?? null,
    website: gp.websiteUri ?? null,
    lat: gp.location.latitude,
    lng: gp.location.longitude,
    rating: gp.rating ?? null,
    photoUrl,
    description,
    hoursOfOperation: gp.regularOpeningHours?.weekdayDescriptions ?? null,
    category,
    denomination,
    specialties,
  }
}
