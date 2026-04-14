import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  buildShareUrl,
  buildShareFilename,
  isIOSSafari,
  canShareFiles,
  downloadImage,
  copyImage,
  shareImage,
} from '../shareActions'
import type { VerseSelection } from '@/types/verse-actions'

function makeSel(overrides: Partial<VerseSelection> = {}): VerseSelection {
  return {
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    verses: [{ number: 16, text: 'For God so loved the world' }],
    ...overrides,
  }
}

describe('buildShareUrl', () => {
  it('builds chapter-level URL for single verse', () => {
    expect(buildShareUrl(makeSel())).toBe('worshiproom.com/bible/john/3')
  })

  it('builds chapter-level URL regardless of verse range', () => {
    expect(buildShareUrl(makeSel({ startVerse: 1, endVerse: 6 }))).toBe(
      'worshiproom.com/bible/john/3',
    )
  })
})

describe('buildShareFilename', () => {
  it('single verse filename', () => {
    expect(buildShareFilename(makeSel())).toBe('worship-room-john-3-16.png')
  })

  it('range filename', () => {
    expect(
      buildShareFilename(makeSel({ book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6 })),
    ).toBe('worship-room-psalms-23-1-6.png')
  })

  it('normalizes book slug to lowercase', () => {
    expect(buildShareFilename(makeSel({ book: 'John' }))).toMatch(/^worship-room-john-/)
  })
})

describe('isIOSSafari', () => {
  const originalUA = navigator.userAgent

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    })
  })

  it('detects iPhone', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true,
    })
    expect(isIOSSafari()).toBe(true)
  })

  it('returns false for desktop', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    })
    expect(isIOSSafari()).toBe(false)
  })
})

describe('canShareFiles', () => {
  it('returns false when navigator.share is missing', () => {
    const original = navigator.share
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    })
    expect(canShareFiles()).toBe(false)
    Object.defineProperty(navigator, 'share', {
      value: original,
      configurable: true,
    })
  })
})

describe('downloadImage', () => {
  beforeEach(() => {
    // Ensure non-iOS
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    })
  })

  it('creates temp <a> on desktop', async () => {
    const showToast = vi.fn()
    const blob = new Blob(['test'], { type: 'image/png' })

    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    await downloadImage(blob, 'test.png', showToast)

    expect(mockLink.click).toHaveBeenCalled()
    expect(mockLink.download).toBe('test.png')
    expect(showToast).toHaveBeenCalledWith('Image saved.')
  })

  it('opens new tab on iOS', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true,
    })
    const showToast = vi.fn()
    const blob = new Blob(['test'], { type: 'image/png' })

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null)

    await downloadImage(blob, 'test.png', showToast)

    expect(windowOpen).toHaveBeenCalledWith('blob:test', '_blank')
    expect(showToast).toHaveBeenCalledWith('Long-press the image to save it to Photos.')
  })
})

describe('copyImage', () => {
  it('calls clipboard.write', async () => {
    const showToast = vi.fn()
    const blob = new Blob(['test'], { type: 'image/png' })

    // Polyfill ClipboardItem for jsdom
    if (typeof globalThis.ClipboardItem === 'undefined') {
      globalThis.ClipboardItem = class ClipboardItem {
        constructor(public items: Record<string, Blob>) {}
      } as unknown as typeof globalThis.ClipboardItem
    }

    const mockWrite = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: mockWrite },
      configurable: true,
    })

    await copyImage(blob, showToast)

    expect(mockWrite).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Copied to clipboard')
  })

  it('shows error toast on failure', async () => {
    const showToast = vi.fn()
    const blob = new Blob(['test'], { type: 'image/png' })

    const mockWrite = vi.fn().mockRejectedValue(new Error('Not supported'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: mockWrite },
      configurable: true,
    })

    await copyImage(blob, showToast)

    expect(showToast).toHaveBeenCalledWith("Copy image isn't supported in this browser", 'error')
  })
})

describe('shareImage', () => {
  it('silently ignores AbortError (user cancelled)', async () => {
    const showToast = vi.fn()
    const blob = new Blob(['test'], { type: 'image/png' })
    const abortError = new Error('Abort')
    abortError.name = 'AbortError'

    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abortError),
      configurable: true,
    })

    await shareImage(blob, 'test.png', 'John 3:16', 'worshiproom.com/bible/john/3', showToast)

    expect(showToast).not.toHaveBeenCalled()
  })

  it('shows error toast on non-abort failure', async () => {
    const showToast = vi.fn()
    const blob = new Blob(['test'], { type: 'image/png' })

    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('Share failed')),
      configurable: true,
    })

    await shareImage(blob, 'test.png', 'John 3:16', 'worshiproom.com/bible/john/3', showToast)

    expect(showToast).toHaveBeenCalledWith("Couldn't share the image. Try again.", 'error')
  })
})
