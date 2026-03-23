export interface ShareCanvasOptions {
  challengeTitle: string
  themeColor: string
  currentDay: number
  totalDays: number
  streak: number
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function generateChallengeShareImage(
  options: ShareCanvasOptions,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')!

  // Wait for fonts to be available
  await document.fonts.ready

  // 1. Background gradient (themeColor → darkened shade)
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1080)
  gradient.addColorStop(0, options.themeColor)
  gradient.addColorStop(1, darkenColor(options.themeColor, 0.4))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1080)

  // 2. Challenge title (Caveat ~72px, white, centered, top third)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 72px Caveat, cursive'
  ctx.textAlign = 'center'
  ctx.fillText(options.challengeTitle, 540, 360, 880)

  // 3. "Day X of Y Complete" (Inter ~36px, white, below title)
  ctx.font = '36px Inter, sans-serif'
  ctx.fillText(
    `Day ${options.currentDay} of ${options.totalDays} Complete`,
    540,
    440,
  )

  // 4. Progress bar (600px wide, 12px tall, centered)
  const barX = 240
  const barY = 500
  const barW = 600
  const barH = 12
  const pct = options.currentDay / options.totalDays

  // Background track
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  roundedRect(ctx, barX, barY, barW, barH, 6)
  ctx.fill()

  // Filled portion
  ctx.fillStyle = '#FFFFFF'
  roundedRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, 6)
  ctx.fill()

  // 5. Streak text (if > 3)
  if (options.streak > 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '24px Inter, sans-serif'
    ctx.fillText(`🔥 ${options.streak} day streak`, 540, 570)
  }

  // 6. Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '28px Caveat, cursive'
  ctx.fillText('Worship Room', 540, 1020)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    )
  })
}
