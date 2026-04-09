import type { VerseSelection } from '@/types/verse-actions'

/** Build a chapter-level URL for share text payload */
export function buildShareUrl(sel: VerseSelection): string {
  const bookSlug = sel.book.toLowerCase()
  return `worshiproom.com/bible/${bookSlug}/${sel.chapter}`
}

/** Build a download filename */
export function buildShareFilename(sel: VerseSelection): string {
  const bookSlug = sel.book.toLowerCase()
  const endSuffix = sel.endVerse !== sel.startVerse ? `-${sel.endVerse}` : ''
  return `worship-room-${bookSlug}-${sel.chapter}-${sel.startVerse}${endSuffix}.png`
}

/** Detect iOS Safari for download fallback */
export function isIOSSafari(): boolean {
  return /iPhone|iPad/.test(navigator.userAgent)
}

/** Check if native share with files is supported */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    return navigator.canShare?.({ files: [new File([], 'test.png', { type: 'image/png' })] }) ?? false
  } catch {
    return false
  }
}

/** Download a blob as a PNG file */
export async function downloadImage(
  blob: Blob,
  filename: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void,
): Promise<void> {
  if (isIOSSafari()) {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    showToast('Long-press the image to save it to Photos.')
    // Revoke after a delay to allow the new tab to load
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('Image saved.')
}

/** Copy a blob to clipboard */
export async function copyImage(
  blob: Blob,
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void,
): Promise<void> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    showToast('Copied to clipboard')
  } catch {
    showToast("Copy image isn't supported in this browser", 'error')
  }
}

/** Share a blob via Web Share API */
export async function shareImage(
  blob: Blob,
  filename: string,
  reference: string,
  shareUrl: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void,
): Promise<void> {
  try {
    const file = new File([blob], filename, { type: 'image/png' })
    await navigator.share({
      files: [file],
      title: reference,
      text: `${reference} — ${shareUrl}`,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    showToast("Couldn't share the image. Try again.", 'error')
  }
}
