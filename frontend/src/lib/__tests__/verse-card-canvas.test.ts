import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateVerseImage,
  generateVerseImageTemplated,
  wrapText,
} from '../verse-card-canvas'

// Mock canvas
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
const mockArcTo = vi.fn()
const mockClosePath = vi.fn()
const mockFill = vi.fn()
const mockStroke = vi.fn()
const mockSave = vi.fn()
const mockRestore = vi.fn()

const mockCtx = {
  measureText: mockMeasureText,
  fillText: mockFillText,
  fillRect: mockFillRect,
  createLinearGradient: mockCreateLinearGradient,
  createRadialGradient: mockCreateRadialGradient,
  beginPath: mockBeginPath,
  moveTo: mockMoveTo,
  lineTo: mockLineTo,
  arcTo: mockArcTo,
  closePath: mockClosePath,
  fill: mockFill,
  stroke: mockStroke,
  save: mockSave,
  restore: mockRestore,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetY: 0,
}

const mockFontsLoad = vi.fn(() => Promise.resolve())

beforeEach(() => {
  vi.clearAllMocks()

  // Mock document.fonts
  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve(), load: mockFontsLoad },
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

function setupBlobSuccess() {
  const testBlob = new Blob(['test'], { type: 'image/png' })
  mockToBlob.mockImplementation(
    (callback: (blob: Blob | null) => void) => {
      callback(testBlob)
    },
  )
  return testBlob
}

describe('generateVerseImage (backward compat)', () => {
  it('returns a Blob when canvas.toBlob succeeds', async () => {
    const testBlob = setupBlobSuccess()
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
    setupBlobSuccess()
    await generateVerseImage('Short verse.', 'Psalm 1:1')
    expect(mockCreateLinearGradient).toHaveBeenCalledWith(0, 0, 0, 600)
  })

  it('draws the verse text and reference', async () => {
    setupBlobSuccess()
    await generateVerseImage('The Lord is my shepherd.', 'Psalm 23:1')

    expect(mockFillText).toHaveBeenCalled()

    const refCall = mockFillText.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Psalm 23:1'),
    )
    expect(refCall).toBeDefined()

    const watermarkCall = mockFillText.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Worship Room'),
    )
    expect(watermarkCall).toBeDefined()
  })

  it('exports as PNG', async () => {
    setupBlobSuccess()
    await generateVerseImage('Test text', 'Test 1:1')
    expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })
})

describe('generateVerseImageTemplated', () => {
  it.each(['classic', 'radiant', 'nature', 'bold'] as const)(
    'returns blob for %s template (square)',
    async (template) => {
      const testBlob = setupBlobSuccess()
      const result = await generateVerseImageTemplated(
        'For God so loved the world.',
        'John 3:16',
        template,
        'square',
      )
      expect(result).toBe(testBlob)
    },
  )

  it.each(['square', 'story', 'wide'] as const)(
    'returns blob for classic template at %s size',
    async (size) => {
      setupBlobSuccess()
      const result = await generateVerseImageTemplated(
        'The Lord is my shepherd.',
        'Psalm 23:1',
        'classic',
        size,
      )
      expect(result).toBeInstanceOf(Blob)
    },
  )

  it('calls document.fonts.load for font preloading', async () => {
    setupBlobSuccess()
    await generateVerseImageTemplated('Test.', 'Test 1:1', 'classic', 'square')
    expect(mockFontsLoad).toHaveBeenCalledWith('italic 28px Lora')
    expect(mockFontsLoad).toHaveBeenCalledWith('bold 28px Inter')
    expect(mockFontsLoad).toHaveBeenCalledWith('28px Caveat')
  })
})

describe('wrapText', () => {
  it('wraps long text into multiple lines', () => {
    // measureText returns width 50 for any text, maxWidth 100
    // Each word will fit, two words will measure 50 (mocked), so wrapping depends on mock
    // With our mock always returning 50, "hello world foo bar" all fit in one line
    // Let's use a more targeted mock
    const ctx = {
      measureText: vi.fn((t: string) => ({ width: t.length * 10 })),
    } as unknown as CanvasRenderingContext2D

    const lines = wrapText(ctx, 'hello world foo bar baz', 80)
    expect(lines.length).toBeGreaterThan(1)
  })

  it('handles single long word as single line', () => {
    const ctx = {
      measureText: vi.fn(() => ({ width: 200 })),
    } as unknown as CanvasRenderingContext2D

    const lines = wrapText(ctx, 'superlongword', 100)
    expect(lines).toEqual(['superlongword'])
  })
})
