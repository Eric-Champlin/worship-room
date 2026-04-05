import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateGardenShareImage } from '../garden-share-canvas'

// Mock canvas context
const mockCtx = {
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
  font: '',
  textAlign: '',
}

// Mock canvas element
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => mockCtx),
  toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
    cb(new Blob(['test'], { type: 'image/png' }))
  }),
}

// Mock SVG element
const mockSvg = {
  outerHTML: '<svg></svg>',
} as unknown as SVGSVGElement

// Mock XMLSerializer
const mockSerialize = vi.fn(() => '<svg></svg>')
vi.stubGlobal(
  'XMLSerializer',
  class {
    serializeToString = mockSerialize
  },
)

// Mock URL
const mockRevokeObjectURL = vi.fn()
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: mockRevokeObjectURL,
})

// Mock Image
let imageOnLoad: (() => void) | null = null
let imageOnError: (() => void) | null = null
vi.stubGlobal(
  'Image',
  class {
    src = ''
    set onload(fn: () => void) {
      imageOnLoad = fn
    }
    set onerror(fn: () => void) {
      imageOnError = fn
    }
  },
)

// Mock document.fonts.load
vi.stubGlobal('document', {
  ...document,
  createElement: vi.fn((tag: string) => {
    if (tag === 'canvas') return mockCanvas
    return document.createElement(tag)
  }),
  fonts: {
    load: vi.fn(() => Promise.resolve([])),
  },
})

describe('generateGardenShareImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    imageOnLoad = null
    imageOnError = null
  })

  function triggerImageLoad() {
    // Allow microtasks to run so the Image constructor sets handlers
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        imageOnLoad?.()
        resolve()
      }, 0)
    })
  }

  it('generates a Blob of type image/png', async () => {
    const promise = generateGardenShareImage({
      gardenSvgElement: mockSvg,
      userName: 'Eric',
      levelName: 'Blooming',
      streakCount: 7,
    })
    await triggerImageLoad()
    const blob = await promise
    expect(blob).toBeInstanceOf(Blob)
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })

  it('draws background gradient', async () => {
    const promise = generateGardenShareImage({
      gardenSvgElement: mockSvg,
      userName: 'Eric',
      levelName: 'Blooming',
      streakCount: 0,
    })
    await triggerImageLoad()
    await promise
    expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 1080)
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1080)
  })

  it('serializes SVG via XMLSerializer', async () => {
    const promise = generateGardenShareImage({
      gardenSvgElement: mockSvg,
      userName: 'Eric',
      levelName: 'Blooming',
      streakCount: 0,
    })
    await triggerImageLoad()
    await promise
    expect(mockSerialize).toHaveBeenCalledWith(mockSvg)
  })

  it('draws text overlays (name, level, streak)', async () => {
    const promise = generateGardenShareImage({
      gardenSvgElement: mockSvg,
      userName: 'Eric',
      levelName: 'Blooming',
      streakCount: 7,
    })
    await triggerImageLoad()
    await promise
    const fillTextCalls = mockCtx.fillText.mock.calls.map(
      (c: unknown[]) => c[0],
    )
    expect(fillTextCalls).toContain("Eric's Garden")
    expect(fillTextCalls).toContain('Blooming')
    expect(fillTextCalls).toContain('🔥 7-day streak')
    expect(fillTextCalls).toContain('Worship Room')
  })

  it('omits streak text when streakCount is 0', async () => {
    const promise = generateGardenShareImage({
      gardenSvgElement: mockSvg,
      userName: 'Eric',
      levelName: 'Blooming',
      streakCount: 0,
    })
    await triggerImageLoad()
    await promise
    const fillTextCalls = mockCtx.fillText.mock.calls.map(
      (c: unknown[]) => c[0],
    )
    expect(fillTextCalls).not.toContain(expect.stringContaining('streak'))
  })

  it('rejects on SVG image load failure', async () => {
    const promise = generateGardenShareImage({
      gardenSvgElement: mockSvg,
      userName: 'Eric',
      levelName: 'Blooming',
      streakCount: 0,
    })

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        imageOnError?.()
        resolve()
      }, 0)
    })

    await expect(promise).rejects.toThrow('Failed to load garden SVG as image')
  })

  it('revokes object URL after use', async () => {
    const promise = generateGardenShareImage({
      gardenSvgElement: mockSvg,
      userName: 'Eric',
      levelName: 'Blooming',
      streakCount: 0,
    })
    await triggerImageLoad()
    await promise
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
