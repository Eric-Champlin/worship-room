/**
 * Shared image-generation pipeline for share-as-image flows on the Prayer
 * Wall (Specs 6.1 + 6.7).
 *
 * Carries forward 6.1's hard-won gotchas (W33, W34, scale:2, backgroundColor):
 *   - Awaits `document.fonts.ready` BEFORE capture so custom fonts render,
 *     not system fallbacks
 *   - Dynamic-imports `html2canvas` to keep it OUT of the initial bundle
 *     (Gate-30)
 *   - `scale: 2` for resolution
 *   - `backgroundColor: null` so html2canvas reads the inline backgroundColor
 *     on the node (callers pin their own background)
 *
 * The off-screen mount/unmount lifecycle stays in each caller — this module
 * is the pure inner pipeline only.
 */

/**
 * Capture a DOM node to a PNG Blob via html2canvas.
 *
 * Caller is responsible for mounting the node off-screen BEFORE calling
 * (e.g., `position: fixed; left: -99999px`) AND for any one-frame React
 * commit guard (`requestAnimationFrame`) needed before the node is paintable.
 *
 * Returns `null` when canvas.toBlob produces no blob (browser quota, OOM,
 * etc.).
 */
export async function captureDomNodeAsPng(
  node: HTMLElement,
): Promise<Blob | null> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }
  const { default: html2canvas } = await import('html2canvas')
  // Options pinned from 6.1's tuned values:
  //   backgroundColor: null → reads the inline backgroundColor on the node
  //     (callers pin their own; html2canvas handles transparency unreliably)
  //   scale: 2 → 2x resolution for retina / social-platform compression
  //   logging: false → keep prod console clean (W34)
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: 2,
    logging: false,
  })
  // PNG export — privacy posture (Spec 6.7 AC: EXIF/metadata stripping):
  //   Canvas-derived PNGs are EXIF-free by construction. EXIF is a
  //   JPEG-era metadata container; the canvas pixel buffer carries no
  //   camera/device/location metadata, and canvas.toBlob with
  //   'image/png' does not write identifying tEXt/tIME chunks. No
  //   explicit stripping library is required, and that's why this
  //   AC ships with no piexif/exif-strip dependency.
  //
  //   WARNING: if this export is ever changed to a metadata-capable
  //   format (JPEG, WebP-with-EXIF, etc.) OR routed through a library
  //   that can inject metadata, the privacy posture must be
  //   re-evaluated and explicit stripping added. The test in
  //   __tests__/imageGen.test.ts that asserts the toBlob MIME type is
  //   'image/png' is the guardrail against silent regression here.
  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

/**
 * Share a PNG Blob via Web Share API when available, fall back to download.
 *
 * Capability detection mirrors 6.1's pattern:
 *   - `navigator.share` + `navigator.canShare({ files: [file] })` → Web Share
 *   - Otherwise → `URL.createObjectURL` + `<a download>` click + revoke
 *
 * Cancellation behavior: when Web Share is available and the user cancels
 * (or share rejects silently), we return `'cancelled'` and DO NOT fall back
 * to download. Mirrors 6.1's silent .catch — cancelling is an intentional
 * user action; surprising them with a download would be hostile UX.
 */
export async function sharePngOrDownload(
  blob: Blob,
  fileName: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/png' })
  const navAny = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (
    typeof navigator.share === 'function' &&
    navAny.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
