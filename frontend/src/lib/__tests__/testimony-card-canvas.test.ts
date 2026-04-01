import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTestimonyCardImage } from '../testimony-card-canvas'

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

const baseOptions = {
  prayerTitle: 'Healing for Mom',
  scriptureText: 'The Lord has heard my cry for mercy; the Lord accepts my prayer.',
  scriptureReference: 'Psalm 6:9',
}

describe('generateTestimonyCardImage', () => {
  it('returns a Blob with type image/png', async () => {
    const testBlob = setupBlobSuccess()
    const result = await generateTestimonyCardImage(baseOptions)
    expect(result).toBe(testBlob)
    expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })

  it('includes prayer title text on canvas', async () => {
    setupBlobSuccess()
    await generateTestimonyCardImage(baseOptions)
    const fillTextCalls = mockFillText.mock.calls.map((c) => c[0])
    expect(fillTextCalls.some((text: string) => text.includes('Healing for Mom'))).toBe(true)
  })

  it('includes scripture text on canvas', async () => {
    setupBlobSuccess()
    await generateTestimonyCardImage(baseOptions)
    const fillTextCalls = mockFillText.mock.calls.map((c) => c[0])
    expect(fillTextCalls.some((text: string) => text.includes('The Lord has heard'))).toBe(true)
  })

  it('includes scripture reference on canvas', async () => {
    setupBlobSuccess()
    await generateTestimonyCardImage(baseOptions)
    const fillTextCalls = mockFillText.mock.calls.map((c) => c[0])
    expect(fillTextCalls.some((text: string) => text.includes('Psalm 6:9'))).toBe(true)
  })

  it('includes "Worship Room" watermark', async () => {
    setupBlobSuccess()
    await generateTestimonyCardImage(baseOptions)
    const fillTextCalls = mockFillText.mock.calls.map((c) => c[0])
    expect(fillTextCalls).toContain('Worship Room')
  })

  it('handles missing testimony note without error', async () => {
    const testBlob = setupBlobSuccess()
    const result = await generateTestimonyCardImage(baseOptions)
    expect(result).toBe(testBlob)
  })

  it('canvas dimensions are 1080×1080', async () => {
    setupBlobSuccess()
    await generateTestimonyCardImage(baseOptions)
    expect(capturedCanvas.width).toBe(1080)
    expect(capturedCanvas.height).toBe(1080)
  })
})
