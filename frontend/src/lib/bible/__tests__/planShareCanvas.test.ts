import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock canvas APIs for jsdom environment
const mockContext = {
  createLinearGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  createRadialGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  fillText: vi.fn(),
  set fillStyle(_v: string) {},
  set textAlign(_v: string) {},
  set textBaseline(_v: string) {},
  set font(_v: string) {},
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
    cb(new Blob(['test-image'], { type: 'image/png' }))
  })
})

describe('renderPlanCompletionCard', () => {
  it('returns a valid Blob', async () => {
    const { renderPlanCompletionCard } = await import('../planShareCanvas')

    const blob = await renderPlanCompletionCard({
      planTitle: 'Psalms of Comfort',
      daysCompleted: 21,
      dateRange: 'Apr 1 – Apr 21, 2026',
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })
})
