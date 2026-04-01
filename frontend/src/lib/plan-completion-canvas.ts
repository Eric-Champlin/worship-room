export interface PlanCompletionCanvasOptions {
  planTitle: string
  totalDays: number
  totalPoints: number
  scripture: { text: string; reference: string }
  size?: 'square' | 'story'
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export async function generatePlanCompletionImage(
  options: PlanCompletionCanvasOptions,
): Promise<Blob> {
  const { planTitle, totalDays, totalPoints, scripture, size = 'square' } = options
  const isStory = size === 'story'

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = isStory ? 1920 : 1080
  const ctx = canvas.getContext('2d')!

  await document.fonts.ready

  // Background gradient (hero-mid → hero-dark)
  const gradient = ctx.createLinearGradient(0, 0, 1080, canvas.height)
  gradient.addColorStop(0, '#1E0B3E')
  gradient.addColorStop(1, '#0D0620')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, canvas.height)

  ctx.textAlign = 'center'

  const yOffset = isStory ? 280 : 0

  // "Plan Complete" header
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 64px Caveat, cursive'
  ctx.fillText('Plan Complete', 540, 300 + yOffset, 880)

  // Plan title in quotes
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = 'italic 36px Lora, serif'
  ctx.fillText(`"${planTitle}"`, 540, 390 + yOffset, 880)

  // Stats line
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '28px Inter, sans-serif'
  ctx.fillText(`${totalDays} days  ·  +${totalPoints} faith points`, 540, 470 + yOffset, 880)

  // Scripture text (word-wrapped)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = 'italic 24px Lora, serif'
  const lines = wrapText(ctx, scripture.text, 780)
  let scriptureY = 570 + yOffset
  for (const line of lines) {
    ctx.fillText(line, 540, scriptureY)
    scriptureY += 36
  }

  // Scripture reference
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '20px Inter, sans-serif'
  ctx.fillText(`— ${scripture.reference}`, 540, scriptureY + 20)

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '28px Caveat, cursive'
  ctx.fillText('Worship Room', 540, isStory ? 1860 : 1020)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    )
  })
}
