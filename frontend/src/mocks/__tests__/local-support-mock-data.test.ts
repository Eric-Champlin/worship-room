import { describe, it, expect } from 'vitest'
import {
  getMockChurches,
  getMockCounselors,
  getMockCelebrateRecovery,
} from '../local-support-mock-data'
import { createMockService } from '@/services/mock-local-support-service'

describe('local-support-mock-data', () => {
  it('getMockChurches returns non-empty array', () => {
    const churches = getMockChurches()
    expect(churches.length).toBeGreaterThan(0)
    expect(churches[0].category).toBe('churches')
    expect(churches[0].name).toBeTruthy()
    expect(churches[0].address).toBeTruthy()
  })

  it('getMockCounselors returns non-empty array with specialties', () => {
    const counselors = getMockCounselors()
    expect(counselors.length).toBeGreaterThan(0)
    expect(counselors[0].category).toBe('counselors')
    expect(counselors[0].specialties).toBeTruthy()
    expect(Array.isArray(counselors[0].specialties)).toBe(true)
  })

  it('getMockCelebrateRecovery returns non-empty array', () => {
    const crGroups = getMockCelebrateRecovery()
    expect(crGroups.length).toBeGreaterThan(0)
    expect(crGroups[0].category).toBe('celebrate-recovery')
  })

  it('all churches have denomination set', () => {
    const churches = getMockChurches()
    churches.forEach((church) => {
      expect(church.denomination).toBeTruthy()
    })
  })

  it('getter functions return fresh copies', () => {
    const a = getMockChurches()
    const b = getMockChurches()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

describe('mock-local-support-service', () => {
  it('search returns results for churches', async () => {
    const service = createMockService()
    const result = await service.search(
      { lat: 35.6, lng: -87.0, radius: 25, keyword: 'church' },
      0,
    )
    expect(result.places.length).toBeGreaterThan(0)
    expect(result).toHaveProperty('hasMore')
  })

  it('search returns results for counselors', async () => {
    const service = createMockService()
    const result = await service.search(
      { lat: 35.6, lng: -87.0, radius: 25, keyword: 'Christian counselor' },
      0,
    )
    expect(result.places.length).toBeGreaterThan(0)
    expect(result.places[0].category).toBe('counselors')
  })

  it('search returns results for celebrate recovery', async () => {
    const service = createMockService()
    const result = await service.search(
      { lat: 35.6, lng: -87.0, radius: 25, keyword: 'Celebrate Recovery' },
      0,
    )
    expect(result.places.length).toBeGreaterThan(0)
    expect(result.places[0].category).toBe('celebrate-recovery')
  })

  it('geocode returns Columbia TN coords', async () => {
    const service = createMockService()
    const coords = await service.geocode('Nashville, TN')
    expect(coords).toEqual({ lat: 35.6151, lng: -87.0353 })
  })
})
