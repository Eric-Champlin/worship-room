import { wrapText } from './verse-card-canvas'

export interface TestimonyCardOptions {
  prayerTitle: string
  testimonyNote?: string
  scriptureText: string
  scriptureReference: string
}

export async function generateTestimonyCardImage(
  options: TestimonyCardOptions,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')!

  // Wait for fonts
  await Promise.all([
    document.fonts.load('italic 36px Lora'),
    document.fonts.load('bold 64px Caveat'),
    document.fonts.load('22px Inter'),
  ])

  // 1. Base gradient (hero-dark tones)
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1080)
  gradient.addColorStop(0, '#1a0a2e')
  gradient.addColorStop(1, '#0D0620')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1080)

  // 2. Golden radial glow (subtle)
  const radial = ctx.createRadialGradient(540, 400, 0, 540, 400, 500)
  radial.addColorStop(0, 'rgba(217, 119, 6, 0.12)')
  radial.addColorStop(1, 'transparent')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, 1080, 1080)

  ctx.textAlign = 'center'
  let y = 300

  // 3. "God Answered" heading — Caveat bold 64px
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 64px Caveat, cursive'
  ctx.fillText('God Answered', 540, y, 880)
  y += 50

  // 4. Decorative line
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(440, y)
  ctx.lineTo(640, y)
  ctx.stroke()
  y += 50

  // 5. Prayer title in quotes — Lora italic, dynamic size
  const titleFontSize = options.prayerTitle.length > 60 ? 24 : 36
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.font = `italic ${titleFontSize}px Lora, serif`
  const titleLines = wrapText(ctx, `\u201C${options.prayerTitle}\u201D`, 800)
  for (const line of titleLines) {
    ctx.fillText(line, 540, y)
    y += titleFontSize + 10
  }

  // 6. Testimony note (if present)
  if (options.testimonyNote) {
    y += 10
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '22px Inter, sans-serif'
    const noteLines = wrapText(ctx, options.testimonyNote, 780)
    for (const line of noteLines) {
      ctx.fillText(line, 540, y)
      y += 32
    }
  }

  // 7. Scripture text — Lora italic 20px
  y = Math.max(y + 30, 700)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = 'italic 20px Lora, serif'
  const scriptureLines = wrapText(ctx, `\u201C${options.scriptureText}\u201D`, 780)
  for (const line of scriptureLines) {
    ctx.fillText(line, 540, y)
    y += 30
  }

  // 8. Scripture reference — Inter 16px
  y += 5
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '16px Inter, sans-serif'
  ctx.fillText(`\u2014 ${options.scriptureReference}`, 540, y)

  // 9. Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = '28px Caveat, cursive'
  ctx.fillText('Worship Room', 540, 1020)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    )
  })
}
