import type { ShareTemplate, ShareSize } from '@/types/verse-sharing'
import { SHARE_SIZES } from '@/constants/verse-sharing'

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

// --- Dynamic font sizing ---

function getBaseFontSize(textLength: number): number {
  if (textLength < 100) return 28
  if (textLength <= 250) return 22
  return 18
}

function fitVerseText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  scale: number,
  fontFamily: string,
  fontStyle: string,
): { lines: string[]; fontSize: number } {
  let fontSize = getBaseFontSize(text.length) * scale
  const minFontSize = 12 * scale
  const lineHeight = 1.5
  let lines: string[]

  do {
    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`
    lines = wrapText(ctx, text, maxWidth)
    const totalHeight = lines.length * fontSize * lineHeight
    if (totalHeight <= maxHeight) break
    fontSize -= 2 * scale
  } while (fontSize >= minFontSize)

  return { lines, fontSize }
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  fontSize: number,
  lineHeight: number,
) {
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * fontSize * lineHeight)
  }
}

// --- Size-specific text positioning ---

function getTextStartY(
  size: ShareSize,
  h: number,
  maxTextHeight: number,
  totalTextHeight: number,
  fontSize: number,
  padding: number,
): number {
  if (size === 'story') {
    // Upper third for Stories
    return h * 0.25 + (maxTextHeight - totalTextHeight) / 2 + fontSize
  }
  // Centered vertically for square and wide
  return padding + (maxTextHeight - totalTextHeight) / 2 + fontSize
}

function getWideFontMultiplier(size: ShareSize): number {
  return size === 'wide' ? 1.15 : 1
}

// --- Template renderers ---

function renderClassic(
  ctx: CanvasRenderingContext2D,
  text: string,
  reference: string,
  w: number,
  h: number,
  size: ShareSize,
) {
  // Gradient: top-to-bottom #1a0533 → #0f0a1e
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, '#1a0533')
  gradient.addColorStop(1, '#0f0a1e')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)

  const scale = (Math.min(w, h) / 1080) * getWideFontMultiplier(size)
  const padding = w * 0.15
  const maxWidth = w - padding * 2
  const maxTextHeight = h * 0.6

  // Verse text
  const { lines, fontSize } = fitVerseText(
    ctx,
    text,
    maxWidth,
    maxTextHeight,
    scale,
    'Lora, serif',
    'italic',
  )

  const lineHeight = 1.5
  const totalTextHeight = lines.length * fontSize * lineHeight
  const textStartY = getTextStartY(size, h, maxTextHeight, totalTextHeight, fontSize, padding)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `italic ${fontSize}px Lora, serif`
  drawLines(ctx, lines, w / 2, textStartY, fontSize, lineHeight)

  // Reference
  const refFontSize = 14 * scale
  ctx.font = `${refFontSize}px Inter, sans-serif`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  const refY = textStartY + (lines.length - 1) * fontSize * lineHeight + 40 * scale
  ctx.fillText(`— ${reference}`, w / 2, refY)

  // Watermark
  const wmFontSize = 16 * scale
  ctx.font = `${wmFontSize}px Caveat, cursive`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fillText('Worship Room', w / 2, h - 12 * scale)
}

function renderRadiant(
  ctx: CanvasRenderingContext2D,
  text: string,
  reference: string,
  w: number,
  h: number,
  size: ShareSize,
) {
  // Gradient: #1a0533 → #4c1d95 → #831843
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, '#1a0533')
  gradient.addColorStop(0.5, '#4c1d95')
  gradient.addColorStop(1, '#831843')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)

  // Radial glow
  const radial = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6)
  radial.addColorStop(0, 'rgba(255, 255, 255, 0.05)')
  radial.addColorStop(1, 'transparent')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, w, h)

  const scale = (Math.min(w, h) / 1080) * getWideFontMultiplier(size)
  const padding = w * 0.15
  const maxWidth = w - padding * 2
  const maxTextHeight = h * 0.6

  // Verse text with shadow
  const { lines, fontSize } = fitVerseText(
    ctx,
    text,
    maxWidth,
    maxTextHeight,
    scale,
    'Lora, serif',
    'italic',
  )

  const lineHeight = 1.5
  const totalTextHeight = lines.length * fontSize * lineHeight
  const textStartY = getTextStartY(size, h, maxTextHeight, totalTextHeight, fontSize, padding)

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 2
  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `italic ${fontSize}px Lora, serif`
  drawLines(ctx, lines, w / 2, textStartY, fontSize, lineHeight)
  ctx.restore()

  // Reference in pill
  const refFontSize = 14 * scale
  ctx.font = `${refFontSize}px Inter, sans-serif`
  const refText = `— ${reference}`
  const refMetrics = ctx.measureText(refText)
  const refY = textStartY + (lines.length - 1) * fontSize * lineHeight + 40 * scale
  const pillPadX = 16 * scale
  const pillPadY = 8 * scale
  const pillW = refMetrics.width + pillPadX * 2
  const pillH = refFontSize + pillPadY * 2
  const pillX = w / 2 - pillW / 2
  const pillY = refY - refFontSize - pillPadY + 2

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  const pillR = pillH / 2
  ctx.beginPath()
  ctx.moveTo(pillX + pillR, pillY)
  ctx.lineTo(pillX + pillW - pillR, pillY)
  ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillR, pillR)
  ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - pillR, pillY + pillH, pillR)
  ctx.lineTo(pillX + pillR, pillY + pillH)
  ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - pillR, pillR)
  ctx.arcTo(pillX, pillY, pillX + pillR, pillY, pillR)
  ctx.closePath()
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(refText, w / 2, refY)

  // Watermark
  const wmFontSize = 16 * scale
  ctx.font = `${wmFontSize}px Caveat, cursive`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fillText('Worship Room', w / 2, h - 12 * scale)
}

function renderNature(
  ctx: CanvasRenderingContext2D,
  text: string,
  reference: string,
  w: number,
  h: number,
  size: ShareSize,
) {
  // Gradient: #0f172a → #134e4a
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, '#0f172a')
  gradient.addColorStop(1, '#134e4a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)

  const scale = (Math.min(w, h) / 1080) * getWideFontMultiplier(size)
  const padding = w * 0.15
  const maxWidth = w - padding * 2
  const maxTextHeight = h * 0.6
  const cream = '#fef3c7'

  // Verse text
  const { lines, fontSize } = fitVerseText(
    ctx,
    text,
    maxWidth,
    maxTextHeight,
    scale,
    'Lora, serif',
    'italic',
  )

  const lineHeight = 1.5
  const totalTextHeight = lines.length * fontSize * lineHeight
  const textStartY = getTextStartY(size, h, maxTextHeight, totalTextHeight, fontSize, padding)

  // Decorative line above verse
  const lineWidth = w * 0.6
  const lineX = (w - lineWidth) / 2
  const lineAboveY = textStartY - fontSize - 20 * scale
  ctx.strokeStyle = 'rgba(212, 165, 116, 0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(lineX, lineAboveY)
  ctx.lineTo(lineX + lineWidth, lineAboveY)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = cream
  ctx.font = `italic ${fontSize}px Lora, serif`
  drawLines(ctx, lines, w / 2, textStartY, fontSize, lineHeight)

  // Decorative line below verse
  const lineBelowY = textStartY + (lines.length - 1) * fontSize * lineHeight + 20 * scale
  ctx.beginPath()
  ctx.moveTo(lineX, lineBelowY)
  ctx.lineTo(lineX + lineWidth, lineBelowY)
  ctx.stroke()

  // Reference
  const refFontSize = 14 * scale
  ctx.font = `${refFontSize}px Inter, sans-serif`
  ctx.fillStyle = 'rgba(254, 243, 199, 0.6)'
  const refY = lineBelowY + 30 * scale
  ctx.fillText(`— ${reference}`, w / 2, refY)

  // Watermark
  const wmFontSize = 16 * scale
  ctx.font = `${wmFontSize}px Caveat, cursive`
  ctx.fillStyle = 'rgba(254, 243, 199, 0.2)'
  ctx.fillText('Worship Room', w / 2, h - 12 * scale)
}

function renderBold(
  ctx: CanvasRenderingContext2D,
  text: string,
  reference: string,
  w: number,
  h: number,
  size: ShareSize,
) {
  // Solid black background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)

  const scale = (Math.min(w, h) / 1080) * getWideFontMultiplier(size)
  const padding = w * 0.15
  const maxWidth = w - padding * 2 - 20 * scale // extra space for accent bar
  const maxTextHeight = h * 0.6

  // Verse text — Inter Bold, LEFT-aligned
  const { lines, fontSize } = fitVerseText(
    ctx,
    text,
    maxWidth,
    maxTextHeight,
    scale,
    'Inter, sans-serif',
    'bold',
  )

  const lineHeight = 1.5
  const totalTextHeight = lines.length * fontSize * lineHeight
  const textStartY = getTextStartY(size, h, maxTextHeight, totalTextHeight, fontSize, padding)
  const textX = padding + 20 * scale // offset for accent bar

  ctx.textAlign = 'left'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${fontSize}px Inter, sans-serif`
  drawLines(ctx, lines, textX, textStartY, fontSize, lineHeight)

  // Vertical accent bar
  const barX = padding
  const barY = textStartY - fontSize
  const barHeight = totalTextHeight + 10 * scale
  ctx.fillStyle = '#8b5cf6'
  ctx.fillRect(barX, barY, 3 * scale, barHeight)

  // Reference — purple, left-aligned
  const refFontSize = 14 * scale
  ctx.font = `${refFontSize}px Inter, sans-serif`
  ctx.fillStyle = '#8b5cf6'
  const refY = textStartY + (lines.length - 1) * fontSize * lineHeight + 40 * scale
  ctx.fillText(`— ${reference}`, textX, refY)

  // Watermark — bottom-RIGHT
  const wmFontSize = 16 * scale
  ctx.font = `${wmFontSize}px Caveat, cursive`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.textAlign = 'right'
  ctx.fillText('Worship Room', w - padding, h - 12 * scale)
}

// --- Template dispatch ---

const TEMPLATE_RENDERERS: Record<
  ShareTemplate,
  (
    ctx: CanvasRenderingContext2D,
    text: string,
    reference: string,
    w: number,
    h: number,
    size: ShareSize,
  ) => void
> = {
  classic: renderClassic,
  radiant: renderRadiant,
  nature: renderNature,
  bold: renderBold,
}

// --- Public API ---

/**
 * Generate a verse image with a specific template and size.
 * Used by the new SharePanel.
 */
export async function generateVerseImageTemplated(
  text: string,
  reference: string,
  template: ShareTemplate,
  size: ShareSize,
): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load('italic 28px Lora'),
      document.fonts.load('bold 28px Inter'),
      document.fonts.load('28px Caveat'),
    ])
  } catch {
    // Fonts may not be available in all environments; fall back to system fonts
  }

  const { width, height } = SHARE_SIZES[size]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  TEMPLATE_RENDERERS[template](ctx, text, reference, width, height, size)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to generate image'))
    }, 'image/png')
  })
}

/**
 * Original function — backward compatible.
 * Generates a 400×600 Classic-style verse card.
 */
export async function generateVerseImage(
  text: string,
  reference: string,
): Promise<Blob> {
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 600
  const ctx = canvas.getContext('2d')!

  // Gradient background matching hero: #0D0620 → #1E0B3E → #4A1D96
  const gradient = ctx.createLinearGradient(0, 0, 0, 600)
  gradient.addColorStop(0, '#0D0620')
  gradient.addColorStop(0.35, '#1E0B3E')
  gradient.addColorStop(1, '#4A1D96')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 400, 600)

  // Auto-size verse text
  const maxWidth = 320 // 400 - 40*2 margins
  const maxTextHeight = 380
  let fontSize = text.length < 100 ? 28 : text.length < 200 ? 24 : 20
  const lineHeight = 1.5

  let lines: string[]
  // Reduce font size until text fits
  do {
    ctx.font = `italic ${fontSize}px Lora, serif`
    lines = wrapText(ctx, text, maxWidth)
    const totalHeight = lines.length * fontSize * lineHeight
    if (totalHeight <= maxTextHeight) break
    fontSize -= 2
  } while (fontSize >= 12)

  // Draw verse text centered in upper area
  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `italic ${fontSize}px Lora, serif`
  const totalTextHeight = lines.length * fontSize * lineHeight
  const textStartY = 60 + (maxTextHeight - totalTextHeight) / 2 + fontSize

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 200, textStartY + i * fontSize * lineHeight)
  }

  // Draw reference below verse
  ctx.font = '14px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  const refY = textStartY + (lines.length - 1) * fontSize * lineHeight + 40
  ctx.fillText(`— ${reference}`, 200, refY)

  // Draw "Worship Room" watermark at bottom
  ctx.font = '16px Caveat, cursive'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.fillText('Worship Room', 200, 588)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to generate image'))
    }, 'image/png')
  })
}
