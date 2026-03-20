import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateVerseImage } from '../verse-card-canvas'

// Mock canvas
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

  // Mock document.fonts.ready
  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve() },
    writable: true,
    configurable: true,
  })

  // Mock createElement for canvas
  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => mockCtx,
        toBlob: mockToBlob,
      }
      return fakeCanvas as unknown as HTMLElement
    }
    return originalCreateElement(tag)
  })
})

describe('generateVerseImage', () => {
  it('returns a Blob when canvas.toBlob succeeds', async () => {
    const testBlob = new Blob(['test'], { type: 'image/png' })
    mockToBlob.mockImplementation(
      (callback: (blob: Blob | null) => void) => {
        callback(testBlob)
      },
    )

    const result = await generateVerseImage('Test verse text', 'John 3:16')
    expect(result).toBe(testBlob)
  })

  it('rejects when canvas.toBlob returns null', async () => {
    mockToBlob.mockImplementation(
      (callback: (blob: Blob | null) => void) => {
        callback(null)
      },
    )

    await expect(
      generateVerseImage('Test text', 'Psalm 23:1'),
    ).rejects.toThrow('Failed to generate image')
  })

  it('sets canvas dimensions to 400x600', async () => {
    const testBlob = new Blob(['test'], { type: 'image/png' })
    mockToBlob.mockImplementation(
      (callback: (blob: Blob | null) => void) => {
        callback(testBlob)
      },
    )

    await generateVerseImage('Short verse.', 'Psalm 1:1')

    // Verify createLinearGradient called with height 600
    expect(mockCreateLinearGradient).toHaveBeenCalledWith(0, 0, 0, 600)
  })

  it('draws the verse text and reference', async () => {
    const testBlob = new Blob(['test'], { type: 'image/png' })
    mockToBlob.mockImplementation(
      (callback: (blob: Blob | null) => void) => {
        callback(testBlob)
      },
    )

    await generateVerseImage('The Lord is my shepherd.', 'Psalm 23:1')

    // Should have drawn text (verse lines + reference + watermark)
    expect(mockFillText).toHaveBeenCalled()

    // Check that reference was drawn
    const refCall = mockFillText.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Psalm 23:1'),
    )
    expect(refCall).toBeDefined()

    // Check watermark was drawn
    const watermarkCall = mockFillText.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Worship Room'),
    )
    expect(watermarkCall).toBeDefined()
  })

  it('exports as PNG', async () => {
    const testBlob = new Blob(['test'], { type: 'image/png' })
    mockToBlob.mockImplementation(
      (callback: (blob: Blob | null) => void) => {
        callback(testBlob)
      },
    )

    await generateVerseImage('Test text', 'Test 1:1')

    expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })
})
