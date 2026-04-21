import { afterEach, describe, expect, it, vi } from 'vitest'

// Mocks must be declared BEFORE importing the SUT for vitest's hoisting.
vi.mock('../maps-readiness', () => ({
  getMapsReadiness: vi.fn(),
}))

vi.mock('../google-local-support-service', () => ({
  createGoogleService: vi.fn(() => ({
    search: vi.fn(),
    geocode: vi.fn(),
    __source: 'google',
  })),
}))

vi.mock('../mock-local-support-service', () => ({
  createMockService: vi.fn(() => ({
    search: vi.fn(),
    geocode: vi.fn(),
    __source: 'mock',
  })),
}))

import { createLocalSupportService } from '../local-support-service'
import { getMapsReadiness } from '../maps-readiness'

describe('createLocalSupportService factory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the Google-backed service when backend reports Maps ready', async () => {
    vi.mocked(getMapsReadiness).mockResolvedValue(true)
    const s = await createLocalSupportService()
    expect((s as unknown as { __source: string }).__source).toBe('google')
  })

  it('returns the mock service when backend reports Maps not configured', async () => {
    vi.mocked(getMapsReadiness).mockResolvedValue(false)
    const s = await createLocalSupportService()
    expect((s as unknown as { __source: string }).__source).toBe('mock')
  })

  it('returns a promise (factory is async)', () => {
    vi.mocked(getMapsReadiness).mockResolvedValue(true)
    const returned = createLocalSupportService()
    expect(returned).toBeInstanceOf(Promise)
  })
})
