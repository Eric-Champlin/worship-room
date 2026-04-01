export interface GardenShareOptions {
  gardenSvgElement: SVGSVGElement
  userName: string
  levelName: string
  streakCount: number
}

export async function generateGardenShareImage(options: GardenShareOptions): Promise<Blob> {
  const { gardenSvgElement, userName, levelName, streakCount } = options

  // Load fonts
  await Promise.all([
    document.fonts.load('bold 48px Inter'),
    document.fonts.load('32px Inter'),
    document.fonts.load('28px Caveat'),
  ])

  // Create 1080×1080 canvas
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  // Background gradient (#0D0620 → #1E0B3E)
  const bg = ctx.createLinearGradient(0, 0, 0, 1080)
  bg.addColorStop(0, '#0D0620')
  bg.addColorStop(1, '#1E0B3E')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1080, 1080)

  // Serialize SVG → Blob → Image → drawImage
  const svgString = new XMLSerializer().serializeToString(gardenSvgElement)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load garden SVG as image'))
      img.src = url
    })

    // Draw garden in upper 65% of canvas (with padding)
    const gardenY = 40
    const gardenHeight = 1080 * 0.65
    const gardenWidth = 1080 - 80 // 40px padding each side
    ctx.drawImage(img, 40, gardenY, gardenWidth, gardenHeight)
  } finally {
    URL.revokeObjectURL(url)
  }

  // Text overlays (lower area)
  const textY = 40 + 1080 * 0.65 + 40

  // User name's garden
  ctx.font = 'bold 48px Inter, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.fillText(`${userName}'s Garden`, 540, textY)

  // Level
  ctx.font = '32px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillText(levelName, 540, textY + 50)

  // Streak (only if > 0)
  if (streakCount > 0) {
    ctx.fillText(`🔥 ${streakCount}-day streak`, 540, textY + 90)
  }

  // Watermark
  ctx.font = '28px Caveat, cursive'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillText('Worship Room', 540, 1050)

  // Return blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    )
  })
}
