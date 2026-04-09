const BG_TOP = '#0D0620'
const BG_BOTTOM = '#251248'
const PRIMARY = 'rgba(139, 92, 246, 0.30)'
const WHITE = '#FFFFFF'
const WHITE_60 = 'rgba(255, 255, 255, 0.6)'

const CARD_WIDTH = 800
const CARD_HEIGHT = 500

export async function renderPlanCompletionCard(params: {
  planTitle: string
  daysCompleted: number
  dateRange: string
}): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  bg.addColorStop(0, BG_TOP)
  bg.addColorStop(1, BG_BOTTOM)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // Decorative orb
  const orbGrad = ctx.createRadialGradient(
    CARD_WIDTH * 0.5,
    CARD_HEIGHT * 0.3,
    0,
    CARD_WIDTH * 0.5,
    CARD_HEIGHT * 0.3,
    200,
  )
  orbGrad.addColorStop(0, PRIMARY)
  orbGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = orbGrad
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // "Completed" badge
  ctx.font = '600 14px Inter, sans-serif'
  ctx.fillStyle = 'rgba(139, 92, 246, 0.60)'
  const badgeText = 'COMPLETED'
  const badgeWidth = ctx.measureText(badgeText).width + 24
  const badgeX = (CARD_WIDTH - badgeWidth) / 2
  const badgeY = 120
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeWidth, 28, 14)
  ctx.fill()
  ctx.fillStyle = WHITE
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeText, CARD_WIDTH / 2, badgeY + 14)

  // Plan title
  ctx.font = 'bold 36px Inter, sans-serif'
  ctx.fillStyle = WHITE
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(params.planTitle, CARD_WIDTH / 2, 170, CARD_WIDTH - 100)

  // Stats
  ctx.font = '16px Inter, sans-serif'
  ctx.fillStyle = WHITE_60
  ctx.fillText(
    `${params.daysCompleted} days · ${params.dateRange}`,
    CARD_WIDTH / 2,
    230,
    CARD_WIDTH - 100,
  )

  // Branding
  ctx.font = '14px Inter, sans-serif'
  ctx.fillStyle = WHITE_60
  ctx.fillText('Worship Room', CARD_WIDTH / 2, CARD_HEIGHT - 50)

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
