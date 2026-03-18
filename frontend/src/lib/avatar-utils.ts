// --- Initials ---

const INITIALS_COLORS = [
  '#6D28D9',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#0891B2',
  '#7C3AED',
  '#C026D3',
]

export function getInitials(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return '?'

  const words = trimmed.split(/\s+/)
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}

export function getInitialsColor(userId: string): string {
  const hash = userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return INITIALS_COLORS[hash % INITIALS_COLORS.length]
}

// --- Photo Processing ---

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

const OUTPUT_SIZE = 200
const JPEG_QUALITY = 0.8

export async function processAvatarPhoto(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP image.')
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error('Photo must be under 2MB.')
  }

  return new Promise<string>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = OUTPUT_SIZE
        canvas.height = OUTPUT_SIZE
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error('Failed to process photo. Please try again.')
        }

        // Center-crop to square
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2

        ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(dataUrl)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to process photo. Please try again.'))
      } finally {
        URL.revokeObjectURL(url)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load the image. Please try a different file.'))
    }

    img.src = url
  })
}
