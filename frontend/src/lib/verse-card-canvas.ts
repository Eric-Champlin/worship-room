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
