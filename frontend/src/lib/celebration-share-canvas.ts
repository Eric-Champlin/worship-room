import { wrapText } from './verse-card-canvas'
import { LEVEL_SHARE_CONTENT } from '@/constants/dashboard/share-card-content'

// --- Canvas color constants ---

const GRADIENT_TOP = '#0D0620'
const GRADIENT_BOTTOM = '#1E0B3E'
const WHITE = '#FFFFFF'
const WHITE_85 = 'rgba(255,255,255,0.85)'
const WHITE_70 = 'rgba(255,255,255,0.7)'
const WHITE_50 = 'rgba(255,255,255,0.5)'
const WHITE_40 = 'rgba(255,255,255,0.4)'
const WHITE_20 = 'rgba(255,255,255,0.2)'

const SIZE = 1080

// --- Shared helpers (private) ---

function drawDarkGradient(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, GRADIENT_TOP)
  gradient.addColorStop(1, GRADIENT_BOTTOM)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}

function drawAccentGlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
): void {
  const radial = ctx.createRadialGradient(w / 2, 400, 0, w / 2, 400, 500)
  radial.addColorStop(0, color)
  radial.addColorStop(1, 'transparent')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, w, h)
}

function drawDivider(ctx: CanvasRenderingContext2D, w: number, y: number): void {
  ctx.strokeStyle = WHITE_20
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(w / 2 - 100, y)
  ctx.lineTo(w / 2 + 100, y)
  ctx.stroke()
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number): void {
  ctx.fillStyle = WHITE_40
  ctx.font = '28px Caveat, cursive'
  ctx.textAlign = 'center'
  ctx.fillText('Worship Room', w / 2, 1020)
}

async function loadShareFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('italic 28px Lora'),
    document.fonts.load('bold 56px Caveat'),
    document.fonts.load('28px Inter'),
  ])
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    )
  })
}

// --- Public renderers ---

export async function generateBadgeShareImage(badge: {
  name: string
  description: string
  icon: string
}): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  await loadShareFonts()

  // Background + glow
  drawDarkGradient(ctx, SIZE, SIZE)
  drawAccentGlow(ctx, SIZE, SIZE, 'rgba(109,40,217,0.15)')

  ctx.textAlign = 'center'

  // Icon
  ctx.fillStyle = WHITE
  ctx.font = '80px serif'
  ctx.fillText(badge.icon, SIZE / 2, 320)

  // "Badge Unlocked!" heading
  ctx.font = 'bold 56px Caveat, cursive'
  ctx.fillText('Badge Unlocked!', SIZE / 2, 420)

  // Badge name in quotes
  ctx.font = '32px Inter, sans-serif'
  ctx.fillText(`\u201C${badge.name}\u201D`, SIZE / 2, 490)

  // Description
  ctx.fillStyle = WHITE_70
  ctx.font = '22px Inter, sans-serif'
  const descLines = wrapText(ctx, badge.description, 800)
  let y = 545
  for (const line of descLines) {
    ctx.fillText(line, SIZE / 2, y)
    y += 32
  }

  // Divider
  drawDivider(ctx, SIZE, Math.max(y + 30, 600))

  // Watermark
  drawWatermark(ctx, SIZE)

  return canvasToBlob(canvas)
}

export async function generateStreakShareImage(
  days: number,
  message: string,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  await loadShareFonts()

  // Background + amber glow
  drawDarkGradient(ctx, SIZE, SIZE)
  drawAccentGlow(ctx, SIZE, SIZE, 'rgba(217,119,6,0.15)')

  ctx.textAlign = 'center'

  // Fire emoji
  ctx.fillStyle = WHITE
  ctx.font = '80px serif'
  ctx.fillText('\uD83D\uDD25', SIZE / 2, 300)

  // Streak heading
  ctx.font = 'bold 56px Caveat, cursive'
  ctx.fillText(`${days}-Day Streak!`, SIZE / 2, 400)

  // Message (Lora italic, word-wrapped)
  ctx.fillStyle = WHITE_85
  ctx.font = 'italic 28px Lora, serif'
  const msgLines = wrapText(ctx, message, 800)
  let y = 480
  for (const line of msgLines) {
    ctx.fillText(line, SIZE / 2, y)
    y += 42
  }

  // Divider
  drawDivider(ctx, SIZE, Math.max(y + 40, 620))

  // Watermark
  drawWatermark(ctx, SIZE)

  return canvasToBlob(canvas)
}

export async function generateLevelUpShareImage(level: number): Promise<Blob> {
  const content = LEVEL_SHARE_CONTENT[level]
  if (!content) {
    return Promise.reject(new Error(`No share content for level ${level}`))
  }

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  await loadShareFonts()

  // Background + green glow
  drawDarkGradient(ctx, SIZE, SIZE)
  drawAccentGlow(ctx, SIZE, SIZE, 'rgba(52,211,153,0.15)')

  ctx.textAlign = 'center'

  // Level icon emoji
  ctx.fillStyle = WHITE
  ctx.font = '80px serif'
  ctx.fillText(content.icon, SIZE / 2, 280)

  // "Level Up!" heading
  ctx.font = 'bold 56px Caveat, cursive'
  ctx.fillText('Level Up!', SIZE / 2, 380)

  // Level name + number
  ctx.font = '28px Inter, sans-serif'
  ctx.fillText(`${content.name} \u2014 Level ${level}`, SIZE / 2, 440)

  // Verse (Lora italic, word-wrapped)
  ctx.fillStyle = WHITE_85
  ctx.font = 'italic 24px Lora, serif'
  const verseLines = wrapText(ctx, `\u201C${content.verse}\u201D`, 800)
  let y = 520
  for (const line of verseLines) {
    ctx.fillText(line, SIZE / 2, y)
    y += 36
  }

  // Reference
  ctx.fillStyle = WHITE_50
  ctx.font = '18px Inter, sans-serif'
  ctx.fillText(`\u2014 ${content.reference}`, SIZE / 2, y + 10)

  // Divider
  drawDivider(ctx, SIZE, Math.max(y + 50, 700))

  // Watermark
  drawWatermark(ctx, SIZE)

  return canvasToBlob(canvas)
}

// --- Monthly share card ---

export interface MonthlyShareData {
  monthName: string
  year: number
  moodAvg: number
  moodLabel: string
  prayCount: number
  journalCount: number
  meditateCount: number
  listenCount: number
  prayerWallCount: number
  bestStreak: number
}

export async function generateMonthlyShareImage(
  data: MonthlyShareData,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  await loadShareFonts()

  // Background + purple glow
  drawDarkGradient(ctx, SIZE, SIZE)
  drawAccentGlow(ctx, SIZE, SIZE, 'rgba(109,40,217,0.15)')

  ctx.textAlign = 'center'

  // "My {Month} {Year}" heading
  ctx.fillStyle = WHITE
  ctx.font = 'bold 56px Caveat, cursive'
  ctx.fillText(`My ${data.monthName} ${data.year}`, SIZE / 2, 300)

  // Stats list (left-aligned within centered block)
  const stats: [string, string][] = []

  if (data.moodAvg > 0) {
    stats.push(['\uD83D\uDE0A', `Mood: Mostly ${data.moodLabel}`])
  }
  if (data.prayCount > 0) {
    stats.push(['\uD83D\uDE4F', `Prayers: ${data.prayCount}`])
  }
  if (data.journalCount > 0) {
    stats.push(['\uD83D\uDCD6', `Journal entries: ${data.journalCount}`])
  }
  if (data.meditateCount > 0) {
    stats.push(['\uD83E\uDDD8', `Meditation sessions: ${data.meditateCount}`])
  }
  if (data.listenCount > 0) {
    stats.push(['\uD83C\uDFB5', `Listening sessions: ${data.listenCount}`])
  }
  if (data.prayerWallCount > 0) {
    stats.push(['\uD83E\uDD1D', `Prayer Wall: ${data.prayerWallCount}`])
  }
  if (data.bestStreak > 0) {
    stats.push(['\uD83D\uDD25', `Best streak: ${data.bestStreak} days`])
  }

  ctx.font = '26px Inter, sans-serif'
  ctx.textAlign = 'left'
  const blockLeft = SIZE / 2 - 300
  let y = 420
  for (const [emoji, text] of stats) {
    ctx.fillStyle = WHITE
    ctx.font = '26px serif'
    ctx.fillText(emoji, blockLeft, y)
    ctx.font = '26px Inter, sans-serif'
    ctx.fillText(text, blockLeft + 40, y)
    y += 50
  }

  // Divider
  ctx.textAlign = 'center'
  drawDivider(ctx, SIZE, y + 30)

  // Watermark
  drawWatermark(ctx, SIZE)

  return canvasToBlob(canvas)
}
