import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { captureDomNodeAsPng, sharePngOrDownload } from '../imageGen'

// --- html2canvas mock ---
//
// captureDomNodeAsPng dynamic-imports html2canvas (Gate-30 — keeps it out of
// the initial bundle). vi.mock hoists, so this mock is in place before the
// dynamic import resolves.
const html2canvasMock = vi.fn(async () => {
  const fakeCanvas = {
    toBlob: (cb: (blob: Blob | null) => void) => {
      cb(new Blob(['png-bytes'], { type: 'image/png' }))
    },
  }
  return fakeCanvas as unknown as HTMLCanvasElement
})

vi.mock('html2canvas', () => ({
  default: html2canvasMock,
}))

describe('captureDomNodeAsPng', () => {
  beforeEach(() => {
    html2canvasMock.mockClear()
  })

  it('awaits document.fonts.ready before html2canvas (W33)', async () => {
    // Replace document.fonts.ready with a controllable deferred promise so we
    // can assert html2canvas is NOT called until the font promise resolves.
    let resolveFonts: () => void = () => {}
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve
    })
    const originalFonts = (
      document as unknown as { fonts?: { ready: Promise<void> } }
    ).fonts
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: fontsReady },
    })

    const node = document.createElement('div')
    const capturePromise = captureDomNodeAsPng(node)

    // Yield several microtasks so that any pending then() chains run. If
    // html2canvas were going to be called without awaiting fonts.ready, it
    // would have been called by now.
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(html2canvasMock).not.toHaveBeenCalled()

    resolveFonts()
    const blob = await capturePromise
    expect(html2canvasMock).toHaveBeenCalledTimes(1)
    expect(blob).toBeInstanceOf(Blob)

    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: originalFonts,
    })
  })

  it('calls html2canvas with scale:2, backgroundColor:null, logging:false', async () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    })

    const node = document.createElement('div')
    await captureDomNodeAsPng(node)
    expect(html2canvasMock).toHaveBeenCalledWith(
      node,
      expect.objectContaining({
        backgroundColor: null,
        scale: 2,
        logging: false,
      }),
    )
  })

  it('exports as image/png with no EXIF/metadata in the blob (Spec 6.7 AC)', async () => {
    // Spec 6.7 AC: "PNG metadata stripped of EXIF". Canvas-derived PNGs
    // are EXIF-free by construction (see imageGen.ts comment at the
    // canvas.toBlob call site for the engineering rationale). This test
    // is the guardrail that locks that posture in against future change.
    //
    // jsdom/vitest limitation: TWO walls block real Blob byte
    // inspection here.
    //   (a) The html2canvas mock in this file produces a fake Blob
    //       whose bytes are the literal string "png-bytes" — NOT a
    //       real canvas-rendered PNG header. There is no real PNG
    //       byte stream to inspect even in principle.
    //   (b) jsdom's Blob implementation does not provide arrayBuffer()
    //       or text() at runtime — both throw TypeError. There is no
    //       cross-version reliable API to read Blob bytes synchronously
    //       in this environment.
    // What we CAN verify (and what locks the safety in against a
    // future regression) is the choice of export format itself:
    //   1. canvas.toBlob is invoked with the 'image/png' MIME type —
    //      not JPEG or any other metadata-capable format. Switching
    //      the export format is the realistic regression vector this
    //      test guards against.
    //   2. The Blob the consumer receives is typed 'image/png'.
    // The real-world safety lives in imageGen.ts at the canvas.toBlob
    // call site — see the comment there for the engineering rationale.
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    })

    let capturedMimeType: string | undefined
    const fakeCanvas = {
      toBlob: (cb: (blob: Blob | null) => void, type?: string) => {
        capturedMimeType = type
        cb(new Blob(['png-bytes'], { type: type ?? 'image/png' }))
      },
    }
    html2canvasMock.mockImplementationOnce(
      async () => fakeCanvas as unknown as HTMLCanvasElement,
    )

    const node = document.createElement('div')
    const blob = await captureDomNodeAsPng(node)

    // (1) MIME type passed to canvas.toBlob is PNG — not JPEG or any
    //     other metadata-capable format.
    expect(capturedMimeType).toBe('image/png')

    // (2) Resulting Blob is PNG-typed.
    expect(blob).toBeInstanceOf(Blob)
    expect(blob?.type).toBe('image/png')
  })
})

describe('sharePngOrDownload', () => {
  const fileName = 'test-image.png'
  const sampleBlob = new Blob(['png-bytes'], { type: 'image/png' })

  // Snapshot of the navigator surface we mutate so each test starts clean.
  let originalShare: ((data?: ShareData) => Promise<void>) | undefined
  let originalCanShare: ((data: ShareData) => boolean) | undefined

  beforeEach(() => {
    originalShare = (navigator as Navigator & { share?: typeof navigator.share }).share
    originalCanShare = (navigator as Navigator & { canShare?: (data: ShareData) => boolean }).canShare
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: originalShare,
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: originalCanShare,
    })
  })

  it('uses Web Share API when canShare returns true', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareSpy,
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    })

    const disposition = await sharePngOrDownload(sampleBlob, fileName)

    expect(disposition).toBe('shared')
    expect(shareSpy).toHaveBeenCalledTimes(1)
    const callArg = shareSpy.mock.calls[0][0]
    expect(callArg.files).toHaveLength(1)
    expect(callArg.files[0].name).toBe(fileName)
    expect(callArg.files[0].type).toBe('image/png')
  })

  it('falls back to download when Web Share is unavailable', async () => {
    // navigator.share undefined → download path.
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: undefined,
    })

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake-url')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    // Spy on the <a> click. document.createElement returns a real HTMLAnchorElement;
    // we replace its click method just for the call we care about.
    const realCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        const el = realCreateElement(tagName) as HTMLElement
        if (tagName === 'a') {
          ;(el as HTMLAnchorElement).click = clickSpy
        }
        return el
      })

    const disposition = await sharePngOrDownload(sampleBlob, fileName)

    expect(disposition).toBe('downloaded')
    expect(createObjectURLSpy).toHaveBeenCalledWith(sampleBlob)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url')

    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    createElementSpy.mockRestore()
  })
})
