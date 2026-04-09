import { describe, expect, it, vi, beforeEach } from 'vitest'
import { wrapText, calculateFontSize, drawOrbs, renderShareCard } from '../shareCardRenderer'
import { HIGHLIGHT_ORB_COLORS } from '@/constants/bible-share'
import type { ShareCardOptions } from '@/types/bible-share'

// --- Mock canvas context ---

function createMockCtx(): CanvasRenderingContext2D {
  const fillCalls: Array<{ style: string | CanvasGradient; args?: unknown[] }> = []
  const textCalls: Array<{ text: string; x: number; y: number; font: string; fillStyle: string | CanvasGradient }> = []
  let currentFont = ''
  let currentFillStyle: string | CanvasGradient = ''
  let currentTextAlign = 'start'

  return {
    fillCalls,
    textCalls,
    get font() {
      return currentFont
    },
    set font(v: string) {
      currentFont = v
    },
    get fillStyle() {
      return currentFillStyle
    },
    set fillStyle(v: string | CanvasGradient) {
      currentFillStyle = v
      fillCalls.push({ style: v })
    },
    get textAlign() {
      return currentTextAlign
    },
    set textAlign(v: string) {
      currentTextAlign = v
    },
    measureText: (text: string) => ({ width: text.length * 8 }),
    fillRect: vi.fn(),
    fillText: (text: string, x: number, y: number) => {
      textCalls.push({ text, x, y, font: currentFont, fillStyle: currentFillStyle })
    },
    createLinearGradient: () => ({
      addColorStop: vi.fn(),
    }),
    createRadialGradient: () => ({
      addColorStop: vi.fn(),
    }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D
}

// --- wrapText tests ---

describe('wrapText', () => {
  it('wraps short text to 1 line', () => {
    const ctx = createMockCtx()
    const lines = wrapText(ctx, 'Hello world', 200)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('Hello world')
  })

  it('wraps multi-word text to multiple lines', () => {
    const ctx = createMockCtx()
    // With 8px per char, "The quick brown fox" = 19 chars * 8 = 152px
    const lines = wrapText(ctx, 'The quick brown fox jumps over', 100)
    expect(lines.length).toBeGreaterThan(1)
  })

  it('handles single long word with character break', () => {
    const ctx = createMockCtx()
    // "Superlongword" = 13 chars * 8 = 104px, maxWidth = 50
    const lines = wrapText(ctx, 'Superlongword', 50)
    expect(lines.length).toBeGreaterThan(1)
    // Joined lines should reconstruct the original word
    expect(lines.join('')).toBe('Superlongword')
  })

  it('keeps punctuation with preceding word', () => {
    const ctx = createMockCtx()
    const lines = wrapText(ctx, 'Hello, world!', 200)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('Hello, world!')
  })
})

// --- calculateFontSize tests ---

describe('calculateFontSize', () => {
  it('returns largest tier for short text (<100 chars)', () => {
    const size = calculateFontSize(50, 2160)
    expect(size).toBeCloseTo(2160 * 0.033, 0)
  })

  it('returns medium tier for medium text (100-250 chars)', () => {
    const size = calculateFontSize(150, 2160)
    expect(size).toBeCloseTo(2160 * 0.026, 0)
  })

  it('returns smaller tier for long text (250-500 chars)', () => {
    const size = calculateFontSize(350, 2160)
    // 2160 * 0.020 = 43.2, but floor is 2160 * 0.026 = 56.16
    // Floor wins for standard (non-wide) canvas
    const floor = 2160 * 0.026
    expect(size).toBeGreaterThanOrEqual(floor)
  })

  it('never goes below floor', () => {
    const size = calculateFontSize(1000, 2160)
    const floor = 2160 * 0.026
    expect(size).toBeGreaterThanOrEqual(floor)
  })

  it('scales with canvas width for wide format', () => {
    const sizeStandard = calculateFontSize(150, 2160)
    const sizeWide = calculateFontSize(150, 3840)
    expect(sizeWide).toBeGreaterThan(sizeStandard)
  })
})

// --- drawOrbs tests ---

describe('drawOrbs', () => {
  it('uses highlight color when provided', () => {
    const ctx = createMockCtx()
    const gradients: Array<{ addColorStop: ReturnType<typeof vi.fn> }> = []
    ctx.createRadialGradient = (() => {
      const g = { addColorStop: vi.fn() }
      gradients.push(g)
      return g
    }) as unknown as CanvasRenderingContext2D['createRadialGradient']

    drawOrbs(ctx, 2160, 2160, 'joy')

    // First orb should use joy color
    const firstOrbCalls = gradients[0].addColorStop.mock.calls
    expect(firstOrbCalls[0][1]).toBe(HIGHLIGHT_ORB_COLORS.joy)
  })

  it('uses default purple when no highlight', () => {
    const ctx = createMockCtx()
    const gradients: Array<{ addColorStop: ReturnType<typeof vi.fn> }> = []
    ctx.createRadialGradient = (() => {
      const g = { addColorStop: vi.fn() }
      gradients.push(g)
      return g
    }) as unknown as CanvasRenderingContext2D['createRadialGradient']

    drawOrbs(ctx, 2160, 2160, null)

    const firstOrbCalls = gradients[0].addColorStop.mock.calls
    expect(firstOrbCalls[0][1]).toBe('rgba(139, 92, 246, 0.30)')
  })
})

// --- renderShareCard integration tests ---

describe('renderShareCard', () => {
  beforeEach(() => {
    // Mock document.fonts (not available in jsdom)
    const mockFonts = { load: vi.fn().mockResolvedValue([]) }
    Object.defineProperty(document, 'fonts', {
      value: mockFonts,
      writable: true,
      configurable: true,
    })

    // Mock createElement to return a canvas with mock context
    const mockCtx = createMockCtx()
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => mockCtx,
      toBlob: (cb: (blob: Blob | null) => void) => {
        cb(new Blob(['test'], { type: 'image/png' }))
      },
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement)
  })

  it('returns a Blob', async () => {
    const blob = await renderShareCard(
      [{ number: 16, text: 'For God so loved the world' }],
      'John 3:16',
      { format: 'square', includeReference: true, highlightColor: null },
    )
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })

  it('awaits font loading before rendering', async () => {
    await renderShareCard(
      [{ number: 1, text: 'Test' }],
      'Genesis 1:1',
      { format: 'square', includeReference: true, highlightColor: null },
    )
    expect(document.fonts.load).toHaveBeenCalledWith('400 48px Lora')
    expect(document.fonts.load).toHaveBeenCalledWith('400 16px Inter')
  })

  it('renders all 4 formats without error', async () => {
    const formats: ShareCardOptions['format'][] = ['square', 'story', 'portrait', 'wide']
    for (const format of formats) {
      const blob = await renderShareCard(
        [{ number: 1, text: 'In the beginning God created the heavens and the earth.' }],
        'Genesis 1:1',
        { format, includeReference: true, highlightColor: null },
      )
      expect(blob).toBeInstanceOf(Blob)
    }
  })

  it('handles multi-verse selections', async () => {
    const blob = await renderShareCard(
      [
        { number: 16, text: 'For God so loved the world' },
        { number: 17, text: 'For God did not send his Son into the world to judge the world' },
        { number: 18, text: 'He who believes in him is not judged' },
      ],
      'John 3:16–18',
      { format: 'square', includeReference: true, highlightColor: null },
    )
    expect(blob).toBeInstanceOf(Blob)
  })

  it('renders without reference when includeReference is false', async () => {
    const blob = await renderShareCard(
      [{ number: 16, text: 'For God so loved the world' }],
      'John 3:16',
      { format: 'square', includeReference: false, highlightColor: null },
    )
    expect(blob).toBeInstanceOf(Blob)
  })
})
