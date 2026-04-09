import type { ShareCardOptions, ShareFormat } from '@/types/bible-share'
import { HIGHLIGHT_ORB_COLORS, SHARE_FORMATS } from '@/constants/bible-share'

// --- Canvas color constants ---

const BG_TOP = '#0D0620'
const BG_MID = '#1E0B3E'
const BG_BOTTOM = '#251248'
const DEFAULT_ORB = 'rgba(139, 92, 246, 0.30)'
const WHITE = '#FFFFFF'
const WHITE_60 = 'rgba(255, 255, 255, 0.6)'
const WHITE_40 = 'rgba(255, 255, 255, 0.4)'
const WHITE_35 = 'rgba(255, 255, 255, 0.35)'
const WHITE_25 = 'rgba(255, 255, 255, 0.25)'

// --- Safe area ---

interface SafeArea {
  x: number
  y: number
  width: number
  height: number
}

function getSafeArea(w: number, h: number): SafeArea {
  const inset = 0.08
  return {
    x: w * inset,
    y: h * inset,
    width: w * (1 - 2 * inset),
    height: h * (1 - 2 * inset),
  }
}

// --- Font loading ---

async function loadFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('400 48px Lora'),
    document.fonts.load('700 48px Lora'),
    document.fonts.load('400 16px Inter'),
  ])
}

// --- Word wrapping ---

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    // Handle extremely long words that exceed maxWidth on their own
    if (ctx.measureText(word).width > maxWidth && !currentLine) {
      let remaining = word
      while (remaining.length > 0) {
        let end = remaining.length
        while (end > 1 && ctx.measureText(remaining.slice(0, end)).width > maxWidth) {
          end--
        }
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = remaining.slice(0, end)
        remaining = remaining.slice(end)
      }
      continue
    }

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

// --- Font sizing ---

export function calculateFontSize(charCount: number, canvasWidth: number): number {
  const isWide = canvasWidth > 2200
  let size: number
  if (charCount < 100) {
    size = canvasWidth * 0.033
  } else if (charCount <= 250) {
    size = canvasWidth * 0.026
  } else if (charCount <= 500) {
    size = canvasWidth * 0.020
  } else {
    size = canvasWidth * 0.016
  }
  const floor = isWide ? canvasWidth * 0.015 : canvasWidth * 0.026
  return Math.max(size, floor)
}

// --- Background ---

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, BG_TOP)
  grad.addColorStop(0.4, BG_MID)
  grad.addColorStop(1, BG_BOTTOM)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

// --- Glow orbs ---

export function drawOrbs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  highlightColor: ShareCardOptions['highlightColor'],
): void {
  const color = highlightColor ? HIGHLIGHT_ORB_COLORS[highlightColor] : DEFAULT_ORB

  // Top-right orb
  const orb1 = ctx.createRadialGradient(w * 0.8, h * 0.15, 0, w * 0.8, h * 0.15, w * 0.35)
  orb1.addColorStop(0, color)
  orb1.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = orb1
  ctx.fillRect(0, 0, w, h)

  // Bottom-left orb
  const orb2 = ctx.createRadialGradient(w * 0.2, h * 0.85, 0, w * 0.2, h * 0.85, w * 0.35)
  orb2.addColorStop(0, color)
  orb2.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = orb2
  ctx.fillRect(0, 0, w, h)

  // Center-bottom orb (subtler)
  const subtlerColor = highlightColor
    ? HIGHLIGHT_ORB_COLORS[highlightColor].replace('0.35', '0.20')
    : DEFAULT_ORB.replace('0.30', '0.15')
  const orb3 = ctx.createRadialGradient(w * 0.5, h * 0.7, 0, w * 0.5, h * 0.7, w * 0.3)
  orb3.addColorStop(0, subtlerColor)
  orb3.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = orb3
  ctx.fillRect(0, 0, w, h)
}

// --- Verse text ---

function drawVerseText(
  ctx: CanvasRenderingContext2D,
  verses: Array<{ number: number; text: string }>,
  w: number,
  _h: number,
  fontSize: number,
  safeArea: SafeArea,
  format: ShareFormat,
): number {
  const isWide = format === 'wide'
  const lineHeight = 1.6
  const textMaxWidth = isWide ? safeArea.width * 0.58 : safeArea.width
  const isMultiVerse = verses.length > 1

  ctx.textAlign = isWide ? 'left' : 'center'
  const textX = isWide ? safeArea.x : w / 2

  // Combine all verse text for wrapping
  const allLines: Array<{ text: string; isVerseNumber: boolean; verseNum?: number }> = []

  for (const verse of verses) {
    const cleanText = verse.text.trim()
    ctx.font = `400 ${fontSize}px Lora`
    const wrappedLines = wrapText(ctx, cleanText, textMaxWidth)

    for (let i = 0; i < wrappedLines.length; i++) {
      allLines.push({
        text: wrappedLines[i],
        isVerseNumber: isMultiVerse && i === 0,
        verseNum: verse.number,
      })
    }
  }

  // Center the text block vertically in the safe area (leaving room for reference/wordmark)
  const totalTextHeight = allLines.length * fontSize * lineHeight
  const availableHeight = safeArea.height * 0.7
  let startY = safeArea.y + (availableHeight - totalTextHeight) / 2 + fontSize

  // Clamp to safe area top
  startY = Math.max(startY, safeArea.y + fontSize)

  let currentY = startY

  for (const line of allLines) {
    if (line.isVerseNumber && isMultiVerse) {
      // Draw verse number in muted color, smaller font
      const numFontSize = fontSize * 0.55
      const numText = `${line.verseNum} `
      ctx.font = `700 ${numFontSize}px Inter`
      ctx.fillStyle = WHITE_40
      const numWidth = ctx.measureText(numText).width

      if (isWide) {
        ctx.fillText(numText, textX, currentY)
        ctx.font = `400 ${fontSize}px Lora`
        ctx.fillStyle = WHITE
        ctx.fillText(line.text, textX + numWidth, currentY)
      } else {
        // For centered text, measure verse text in its actual render font
        ctx.font = `400 ${fontSize}px Lora`
        const textWidth = ctx.measureText(line.text).width
        const lineWidth = numWidth + textWidth
        const numX = w / 2 - lineWidth / 2
        ctx.textAlign = 'left'
        ctx.font = `700 ${numFontSize}px Inter`
        ctx.fillText(numText, numX, currentY)
        ctx.font = `400 ${fontSize}px Lora`
        ctx.fillStyle = WHITE
        ctx.fillText(line.text, numX + numWidth, currentY)
        ctx.textAlign = 'center'
      }
    } else {
      ctx.font = `400 ${fontSize}px Lora`
      ctx.fillStyle = WHITE
      ctx.fillText(line.text, textX, currentY)
    }

    currentY += fontSize * lineHeight
  }

  return currentY
}

// --- Reference ---

function drawReference(
  ctx: CanvasRenderingContext2D,
  reference: string,
  w: number,
  h: number,
  safeArea: SafeArea,
  format: ShareFormat,
  textBottom: number,
): void {
  const isWide = format === 'wide'
  const fontSize = isWide ? 40 : 36
  ctx.font = `500 ${fontSize}px Inter`
  ctx.fillStyle = WHITE_60

  if (isWide) {
    // Right column, vertically centered
    const rightX = safeArea.x + safeArea.width * 0.66
    const centerY = h / 2
    ctx.textAlign = 'center'
    ctx.fillText(reference, rightX + safeArea.width * 0.17, centerY)
  } else {
    // Below verse text, centered
    ctx.textAlign = 'center'
    const refY = Math.min(textBottom + fontSize * 1.5, safeArea.y + safeArea.height * 0.85)
    ctx.fillText(reference, w / 2, refY)
  }
}

// --- Wide format separator ---

function drawWideSeparator(
  ctx: CanvasRenderingContext2D,
  _w: number,
  _h: number,
  safeArea: SafeArea,
): void {
  const separatorX = safeArea.x + safeArea.width * 0.62
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(separatorX, safeArea.y + safeArea.height * 0.2)
  ctx.lineTo(separatorX, safeArea.y + safeArea.height * 0.8)
  ctx.stroke()
}

// --- Wordmark ---

function drawWordmark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  safeArea: SafeArea,
  format: ShareFormat,
): void {
  const isWide = format === 'wide'
  const fontSize = 24
  ctx.font = `500 ${fontSize}px Inter`
  ctx.fillStyle = WHITE_35

  if (isWide) {
    // Below reference in the right column
    const rightCenterX = safeArea.x + safeArea.width * 0.83
    ctx.textAlign = 'center'
    ctx.fillText('Worship Room', rightCenterX, h / 2 + 50)
  } else {
    ctx.textAlign = 'center'
    ctx.fillText('Worship Room', w / 2, safeArea.y + safeArea.height - fontSize * 1.5)
  }
}

// --- Attribution ---

function drawAttribution(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  safeArea: SafeArea,
  format: ShareFormat,
): void {
  const isWide = format === 'wide'
  const fontSize = 20
  ctx.font = `400 ${fontSize}px Inter`
  ctx.fillStyle = WHITE_25
  const text = 'World English Bible · Public Domain'

  if (isWide) {
    const rightCenterX = safeArea.x + safeArea.width * 0.83
    ctx.textAlign = 'center'
    ctx.fillText(text, rightCenterX, safeArea.y + safeArea.height - fontSize)
  } else {
    ctx.textAlign = 'center'
    ctx.fillText(text, w / 2, safeArea.y + safeArea.height)
  }
}

// --- Blob export ---

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      },
      'image/png',
    )
  })
}

// --- Public API ---

export async function renderShareCard(
  verses: Array<{ number: number; text: string }>,
  reference: string,
  options: ShareCardOptions,
): Promise<Blob> {
  await loadFonts()

  const dims = SHARE_FORMATS[options.format]
  const { canvasWidth: w, canvasHeight: h } = dims

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  const safeArea = getSafeArea(w, h)

  // 1. Background
  drawBackground(ctx, w, h)

  // 2. Glow orbs
  drawOrbs(ctx, w, h, options.highlightColor)

  // 3. Wide format separator
  if (options.format === 'wide') {
    drawWideSeparator(ctx, w, h, safeArea)
  }

  // 4. Verse text
  const charCount = verses.reduce((sum, v) => sum + v.text.length, 0)
  const fontSize = calculateFontSize(charCount, w)
  const textBottom = drawVerseText(ctx, verses, w, h, fontSize, safeArea, options.format)

  // 5. Reference (optional)
  if (options.includeReference) {
    drawReference(ctx, reference, w, h, safeArea, options.format, textBottom)
  }

  // 6. Wordmark
  drawWordmark(ctx, w, h, safeArea, options.format)

  // 7. Attribution
  drawAttribution(ctx, w, h, safeArea, options.format)

  return canvasToBlob(canvas)
}

// --- Thumbnail rendering ---

export async function renderShareThumbnail(
  _verses: Array<{ number: number; text: string }>,
  reference: string,
  options: ShareCardOptions,
): Promise<Blob> {
  await loadFonts()

  const dims = SHARE_FORMATS[options.format]
  // Render at small dimensions for thumbnails (proportional to full size)
  const thumbScale = 120 / dims.canvasHeight
  const w = Math.round(dims.canvasWidth * thumbScale)
  const h = 120

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  // Simplified rendering for thumbnails — just background + orbs
  drawBackground(ctx, w, h)
  drawOrbs(ctx, w, h, options.highlightColor)

  // Small text hint
  const fontSize = Math.max(8, h * 0.06)
  ctx.font = `400 ${fontSize}px Inter`
  ctx.fillStyle = WHITE_40
  ctx.textAlign = 'center'
  ctx.fillText(reference, w / 2, h / 2)

  return canvasToBlob(canvas)
}
