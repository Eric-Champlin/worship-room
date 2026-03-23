#!/usr/bin/env node

/**
 * Generates PWA app icons from an SVG template.
 * Run once: node scripts/generate-icons.mjs
 * Outputs: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png
 */

import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputDir = join(__dirname, '..', 'public')

const PURPLE = '#6D28D9'
const WHITE = '#FFFFFF'

function createIconSvg(size) {
  const radius = Math.round(size * 0.2)
  const fontSize = Math.round(size * 0.32)
  const textY = Math.round(size * 0.55)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${PURPLE}"/>
  <text x="50%" y="${textY}" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    font-weight="700" font-size="${fontSize}" fill="${WHITE}">WR</text>
</svg>`
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const svg = createIconSvg(size)
  const outputPath = join(outputDir, name)
  await sharp(Buffer.from(svg)).png().toFile(outputPath)
  console.log(`Generated ${name} (${size}x${size})`)
}

console.log('Done — all icons generated in public/')
