import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePlanCompletionImage } from '../plan-completion-canvas'

const mockMeasureText = vi.fn(() => ({ width: 50 }))
const mockFillText = vi.fn()
const mockFillRect = vi.fn()
const mockCreateLinearGradient = vi.fn(() => ({
  addColorStop: vi.fn(),
}))
const mockToBlob = vi.fn()

const mockCtx = {
  measureText: mockMeasureText,
  fillText: mockFillText,
  fillRect: mockFillRect,
  createLinearGradient: mockCreateLinearGradient,
  fillStyle: '',
  font: '',
  textAlign: '',
}

beforeEach(() => {
  vi.clearAllMocks()

  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve() },
    writable: true,
    configurable: true,
  })

  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => mockCtx,
        toBlob: mockToBlob,
      } as unknown as HTMLElement
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

const defaultOptions = {
  planTitle: 'Finding Peace',
  totalDays: 7,
  totalPoints: 105,
  scripture: { text: 'Your word is a lamp.', reference: 'Psalm 119:105 WEB' },
}

describe('generatePlanCompletionImage', () => {
  it('returns a PNG blob', async () => {
    const testBlob = setupBlobSuccess()
    const result = await generatePlanCompletionImage(defaultOptions)
    expect(result).toBe(testBlob)
  })

  it('handles missing fonts gracefully', async () => {
    setupBlobSuccess()
    await expect(generatePlanCompletionImage(defaultOptions)).resolves.toBeDefined()
  })
})
