/**
 * Generate the default Open Graph social share image (1200x630px)
 *
 * Uses sharp to convert an SVG to PNG with the Worship Room branding.
 * Run: npx tsx frontend/scripts/generate-og-image.ts
 */
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const WIDTH = 1200
const HEIGHT = 630

// Build SVG with dark purple gradient background and white text
const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D0620;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1E0B3E;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" style="stop-color:#6D28D9;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#0D0620;stop-opacity:0" />
    </radialGradient>
  </defs>

  <!-- Background gradient -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

  <!-- Subtle radial glow -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />

  <!-- Cross watermark -->
  <line x1="600" y1="80" x2="600" y2="200" stroke="rgba(255,255,255,0.06)" stroke-width="4" />
  <line x1="550" y1="130" x2="650" y2="130" stroke="rgba(255,255,255,0.06)" stroke-width="4" />

  <!-- Title text -->
  <text x="600" y="300" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="bold" fill="white">
    Worship Room
  </text>

  <!-- Subtitle -->
  <text x="600" y="370" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="rgba(255,255,255,0.8)">
    Christian Emotional Healing &amp; Worship
  </text>

  <!-- Bottom accent line -->
  <line x1="450" y1="420" x2="750" y2="420" stroke="#6D28D9" stroke-width="2" opacity="0.6" />

  <!-- URL -->
  <text x="600" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="rgba(255,255,255,0.4)">
    worshiproom.com
  </text>
</svg>`

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(__dirname, '../public/og-default.png')

await sharp(Buffer.from(svg)).png().toFile(outputPath)

console.log(`OG image generated: ${outputPath} (${WIDTH}x${HEIGHT}px)`)
