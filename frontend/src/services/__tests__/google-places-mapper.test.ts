import { describe, expect, it } from 'vitest'
import {
  buildPhotoUrl,
  inferDenomination,
  inferSpecialties,
  mapGooglePlaceToLocalSupport,
  type GooglePlace,
} from '../google-places-mapper'

const API_KEY = 'test-key'

function buildPlace(overrides: Partial<GooglePlace> = {}): GooglePlace {
  return {
    id: 'ChIJ_test_id',
    displayName: { text: 'Test Place' },
    formattedAddress: '123 Main St, Columbia, TN 38401',
    location: { latitude: 35.615, longitude: -87.035 },
    ...overrides,
  }
}

describe('buildPhotoUrl', () => {
  it('constructs the Places Photo media URL with the API key', () => {
    const url = buildPhotoUrl('places/abc/photos/xyz', API_KEY)
    expect(url).toBe(
      'https://places.googleapis.com/v1/places/abc/photos/xyz/media?maxWidthPx=400&key=test-key',
    )
  })

  it('encodes the API key as a query param', () => {
    const url = buildPhotoUrl('places/abc/photos/xyz', 'key with/special&chars')
    expect(url).toContain('key=key%20with%2Fspecial%26chars')
  })

  it('uses maxWidthPx=400 by default and accepts a custom override', () => {
    expect(buildPhotoUrl('places/a/photos/b', API_KEY)).toContain('maxWidthPx=400')
    expect(buildPhotoUrl('places/a/photos/b', API_KEY, 800)).toContain('maxWidthPx=800')
  })
})

describe('inferDenomination', () => {
  it('matches Baptist on First Baptist Church', () => {
    expect(inferDenomination('First Baptist Church', null)).toBe('Baptist')
  })

  it('matches Catholic Church', () => {
    expect(inferDenomination('Saint Mary Catholic Church', null)).toBe('Catholic')
  })

  it('matches Methodist name', () => {
    expect(inferDenomination('Grace United Methodist', null)).toBe('Methodist')
  })

  it('matches Presbyterian name', () => {
    expect(inferDenomination('Hope Presbyterian', null)).toBe('Presbyterian')
  })

  it('matches Lutheran name', () => {
    expect(inferDenomination('St. Paul Lutheran Church', null)).toBe('Lutheran')
  })

  it('matches Church of Christ before any generic "christ" pattern', () => {
    // Church of Christ must win even with other tokens present
    expect(inferDenomination('Downtown Church of Christ', null)).toBe('Church of Christ')
  })

  it('matches Non-denominational (hyphenated)', () => {
    expect(inferDenomination('The Bridge Non-denominational Church', null)).toBe(
      'Non-denominational',
    )
  })

  it('matches nondenominational (no hyphen)', () => {
    expect(inferDenomination('Crossroads Nondenominational Fellowship', null)).toBe(
      'Non-denominational',
    )
  })

  it('returns null for unmatched name', () => {
    expect(inferDenomination('Quaker Meeting', null)).toBeNull()
  })

  it('returns null when description is null and name has no match', () => {
    expect(inferDenomination('Generic Place', null)).toBeNull()
  })

  it('matches denomination from description when name has none', () => {
    expect(
      inferDenomination('The Bridge', 'A Baptist congregation serving Middle Tennessee'),
    ).toBe('Baptist')
  })
})

describe('inferSpecialties', () => {
  it('matches grief counseling', () => {
    expect(inferSpecialties('Grief Counseling Associates', null)).toEqual(['Grief'])
  })

  it('matches anxiety', () => {
    expect(inferSpecialties('Anxiety & Stress Therapy', null)).toEqual(['Anxiety'])
  })

  it('matches depression', () => {
    expect(inferSpecialties('Depression Care Clinic', null)).toEqual(['Depression'])
  })

  it('matches addiction and substance patterns', () => {
    expect(inferSpecialties('Substance Recovery Counseling', null)).toEqual(['Addiction'])
  })

  it('matches marriage / couples / marital', () => {
    expect(inferSpecialties('Couples Therapy Center', null)).toEqual(['Marriage'])
  })

  it('matches trauma', () => {
    expect(inferSpecialties('Trauma Healing Counseling', null)).toEqual(['Trauma'])
  })

  it('matches family', () => {
    expect(inferSpecialties('Family Therapy Partners', null)).toEqual(['Family'])
  })

  it('returns ["General"] when nothing matches', () => {
    expect(inferSpecialties('Generic Therapy Practice', null)).toEqual(['General'])
  })

  it('caps specialty matches at 3', () => {
    const name = 'Grief, Anxiety, Depression, Addiction, Marriage, Trauma, Family counseling'
    const result = inferSpecialties(name, null)
    expect(result).not.toBeNull()
    expect(result!.length).toBe(3)
  })
})

describe('mapGooglePlaceToLocalSupport', () => {
  it('returns null for CLOSED_PERMANENTLY places', () => {
    const gp = buildPlace({ businessStatus: 'CLOSED_PERMANENTLY' })
    expect(mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)).toBeNull()
  })

  it('returns null when displayName is missing', () => {
    const gp = buildPlace({ displayName: undefined })
    expect(mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)).toBeNull()
  })

  it('returns null when displayName.text is empty', () => {
    const gp = buildPlace({ displayName: { text: '' } })
    expect(mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)).toBeNull()
  })

  it('returns null when location is missing', () => {
    const gp = buildPlace()
    // Force location to be undefined via a cast — runtime guard is what we're checking
    const withoutLocation = { ...gp, location: undefined } as unknown as GooglePlace
    expect(mapGooglePlaceToLocalSupport(withoutLocation, 'churches', API_KEY)).toBeNull()
  })

  it('maps a happy-path church with photo + denomination inference', () => {
    const gp = buildPlace({
      displayName: { text: 'First Baptist Church' },
      photos: [{ name: 'places/abc/photos/xyz' }],
      editorialSummary: { text: 'Baptist congregation downtown' },
    })
    const result = mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('First Baptist Church')
    expect(result!.denomination).toBe('Baptist')
    expect(result!.specialties).toBeNull()
    expect(result!.photoUrl).toContain('places/abc/photos/xyz/media?maxWidthPx=400&key=test-key')
  })

  it('maps a happy-path counselor with specialty inference', () => {
    const gp = buildPlace({
      displayName: { text: 'Grief & Loss Counseling' },
      editorialSummary: { text: 'Trauma-informed therapy' },
    })
    const result = mapGooglePlaceToLocalSupport(gp, 'counselors', API_KEY)
    expect(result).not.toBeNull()
    expect(result!.denomination).toBeNull()
    expect(result!.specialties).toEqual(['Grief', 'Trauma'])
  })

  it('maps a celebrate-recovery place without inference (both null)', () => {
    const gp = buildPlace({ displayName: { text: 'Celebrate Recovery Tuesday Nights' } })
    const result = mapGooglePlaceToLocalSupport(gp, 'celebrate-recovery', API_KEY)
    expect(result).not.toBeNull()
    expect(result!.denomination).toBeNull()
    expect(result!.specialties).toBeNull()
  })

  it('falls back to "Address unavailable" when formattedAddress is missing', () => {
    const gp = buildPlace({ formattedAddress: undefined })
    const result = mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)
    expect(result!.address).toBe('Address unavailable')
  })

  it('prefers nationalPhoneNumber over internationalPhoneNumber', () => {
    const gp = buildPlace({
      nationalPhoneNumber: '(615) 555-0100',
      internationalPhoneNumber: '+1 615-555-0100',
    })
    const result = mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)
    expect(result!.phone).toBe('(615) 555-0100')
  })

  it('falls back to internationalPhoneNumber when national is missing', () => {
    const gp = buildPlace({ internationalPhoneNumber: '+1 615-555-0100' })
    const result = mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)
    expect(result!.phone).toBe('+1 615-555-0100')
  })

  it('sets phone to null when both phone fields are missing', () => {
    const gp = buildPlace()
    const result = mapGooglePlaceToLocalSupport(gp, 'churches', API_KEY)
    expect(result!.phone).toBeNull()
  })

  it('sets photoUrl to null when photos is empty or missing', () => {
    const emptyPhotos = mapGooglePlaceToLocalSupport(
      buildPlace({ photos: [] }),
      'churches',
      API_KEY,
    )
    expect(emptyPhotos!.photoUrl).toBeNull()

    const missingPhotos = mapGooglePlaceToLocalSupport(buildPlace(), 'churches', API_KEY)
    expect(missingPhotos!.photoUrl).toBeNull()
  })

  it('passes through rating and hours when present, nulls them when absent', () => {
    const withExtras = mapGooglePlaceToLocalSupport(
      buildPlace({
        rating: 4.6,
        regularOpeningHours: { weekdayDescriptions: ['Sunday: 9:00 AM – 12:00 PM'] },
      }),
      'churches',
      API_KEY,
    )
    expect(withExtras!.rating).toBe(4.6)
    expect(withExtras!.hoursOfOperation).toEqual(['Sunday: 9:00 AM – 12:00 PM'])

    const withoutExtras = mapGooglePlaceToLocalSupport(buildPlace(), 'churches', API_KEY)
    expect(withoutExtras!.rating).toBeNull()
    expect(withoutExtras!.hoursOfOperation).toBeNull()
  })
})
