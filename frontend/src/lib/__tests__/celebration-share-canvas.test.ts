import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateBadgeShareImage,
  generateStreakShareImage,
  generateLevelUpShareImage,
  generateMonthlyShareImage,
} from '../celebration-share-canvas'
import {
  STREAK_SHARE_MESSAGES,
  LEVEL_SHARE_CONTENT,
} from '@/constants/dashboard/share-card-content'

// --- Canvas mocking (follows testimony-card-canvas.test.ts pattern) ---

const mockMeasureText = vi.fn(() => ({ width: 50 }))
const mockFillText = vi.fn()
const mockFillRect = vi.fn()
const mockCreateLinearGradient = vi.fn(() => ({
  addColorStop: vi.fn(),
}))
const mockCreateRadialGradient = vi.fn(() => ({
  addColorStop: vi.fn(),
}))
const mockToBlob = vi.fn()
const mockBeginPath = vi.fn()
const mockMoveTo = vi.fn()
const mockLineTo = vi.fn()
const mockStroke = vi.fn()

const mockCtx = {
  measureText: mockMeasureText,
  fillText: mockFillText,
  fillRect: mockFillRect,
  createLinearGradient: mockCreateLinearGradient,
  createRadialGradient: mockCreateRadialGradient,
  beginPath: mockBeginPath,
  moveTo: mockMoveTo,
  lineTo: mockLineTo,
  stroke: mockStroke,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
}

const mockFontsLoad = vi.fn(() => Promise.resolve())

let capturedCanvas: { width: number; height: number }

beforeEach(() => {
  vi.clearAllMocks()

  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve(), load: mockFontsLoad },
    writable: true,
    configurable: true,
  })

  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => mockCtx,
        toBlob: mockToBlob,
      }
      capturedCanvas = fakeCanvas
      return fakeCanvas as unknown as HTMLElement
    }
    return originalCreateElement(tag)
  })
})

function setupBlobSuccess() {
  const testBlob = new Blob(['test'], { type: 'image/png' })
  mockToBlob.mockImplementation(
    (callback: (blob: Blob | null) => void) => {
      callback(testBlob)
    },
  )
  return testBlob
}

function getFillTextCalls(): string[] {
  return mockFillText.mock.calls.map((c) => c[0])
}

// --- Badge share image ---

describe('generateBadgeShareImage', () => {
  const badgeData = {
    name: 'Prayer Warrior',
    description: 'Prayed 100 times on the wall',
    icon: '🙏',
  }

  it('returns a Blob', async () => {
    const testBlob = setupBlobSuccess()
    const result = await generateBadgeShareImage(badgeData)
    expect(result).toBe(testBlob)
  })

  it('canvas is 1080x1080', async () => {
    setupBlobSuccess()
    await generateBadgeShareImage(badgeData)
    expect(capturedCanvas.width).toBe(1080)
    expect(capturedCanvas.height).toBe(1080)
  })
})

// --- Streak share image ---

describe('generateStreakShareImage', () => {
  it('returns a Blob for each milestone', async () => {
    const milestones = [7, 14, 30, 60, 90, 180, 365]
    for (const days of milestones) {
      const testBlob = setupBlobSuccess()
      const result = await generateStreakShareImage(days, `${days} days of faithfulness.`)
      expect(result).toBe(testBlob)
    }
  })
})

// --- Level-up share image ---

describe('generateLevelUpShareImage', () => {
  it('returns Blob for levels 2-6', async () => {
    for (let level = 2; level <= 6; level++) {
      const testBlob = setupBlobSuccess()
      const result = await generateLevelUpShareImage(level)
      expect(result).toBe(testBlob)
    }
  })

  it('rejects for level 1', async () => {
    setupBlobSuccess()
    await expect(generateLevelUpShareImage(1)).rejects.toThrow('No share content for level 1')
  })
})

// --- Monthly share image ---

describe('generateMonthlyShareImage', () => {
  const baseData = {
    monthName: 'March',
    year: 2026,
    moodAvg: 4,
    moodLabel: 'Good',
    prayCount: 15,
    journalCount: 8,
    meditateCount: 0,
    listenCount: 5,
    prayerWallCount: 3,
    bestStreak: 12,
  }

  it('omits zero-value stats', async () => {
    setupBlobSuccess()
    await generateMonthlyShareImage(baseData)
    const texts = getFillTextCalls()
    expect(texts.some((t: string) => t.includes('Meditation'))).toBe(false)
  })

  it('includes non-zero stats', async () => {
    setupBlobSuccess()
    await generateMonthlyShareImage(baseData)
    const texts = getFillTextCalls()
    expect(texts.some((t: string) => t.includes('Prayers: 15'))).toBe(true)
    expect(texts.some((t: string) => t.includes('Journal entries: 8'))).toBe(true)
    expect(texts.some((t: string) => t.includes('Best streak: 12 days'))).toBe(true)
  })
})

// --- Watermark ---

describe('drawWatermark', () => {
  it('renders "Worship Room"', async () => {
    setupBlobSuccess()
    await generateBadgeShareImage({ name: 'Test', description: 'test', icon: '⭐' })
    const texts = getFillTextCalls()
    expect(texts).toContain('Worship Room')
  })
})

// --- Constants ---

describe('STREAK_SHARE_MESSAGES', () => {
  it('has entries for all 7 milestones', () => {
    const expected = [7, 14, 30, 60, 90, 180, 365]
    for (const days of expected) {
      expect(STREAK_SHARE_MESSAGES[days]).toBeDefined()
      expect(typeof STREAK_SHARE_MESSAGES[days]).toBe('string')
    }
  })
})

describe('LEVEL_SHARE_CONTENT', () => {
  it('has entries for levels 2-6', () => {
    for (let level = 2; level <= 6; level++) {
      expect(LEVEL_SHARE_CONTENT[level]).toBeDefined()
      expect(LEVEL_SHARE_CONTENT[level].name).toBeTruthy()
      expect(LEVEL_SHARE_CONTENT[level].verse).toBeTruthy()
      expect(LEVEL_SHARE_CONTENT[level].reference).toBeTruthy()
    }
  })

  it('all level share verses use WEB translation', () => {
    // Verify exact verse text matches spec
    expect(LEVEL_SHARE_CONTENT[2].verse).toBe(
      'He will be like a tree planted by the streams of water.',
    )
    expect(LEVEL_SHARE_CONTENT[3].verse).toBe(
      'The desert will rejoice and blossom like a rose.',
    )
    expect(LEVEL_SHARE_CONTENT[4].verse).toBe(
      'The righteous shall flourish like the palm tree.',
    )
    expect(LEVEL_SHARE_CONTENT[5].verse).toBe(
      'They may be called trees of righteousness, the planting of the LORD, that he may be glorified.',
    )
    expect(LEVEL_SHARE_CONTENT[6].verse).toBe(
      "You are the light of the world. A city located on a hill can't be hidden.",
    )
  })
})
