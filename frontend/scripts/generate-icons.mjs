#!/usr/bin/env node

/**
 * Generates PWA app icons.
 *
 * Legacy output (public/):
 *   icon-192.png, icon-512.png, apple-touch-icon.png
 *   Generated from an SVG template (purple WR logo).
 *
 * New output (public/icons/):
 *   icon-192.png, icon-256.png, icon-384.png, icon-512.png
 *   icon-512-maskable.png
 *   Generated from public/icon-512.png (the real app icon).
 *
 * Run: node scripts/generate-icons.mjs
 * Idempotent — safe to re-run whenever the source icon changes.
 */

import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')
const sourceIcon = join(publicDir, 'icon-512.png')

// ---------------------------------------------------------------------------
// Legacy: SVG-generated icons in public/ root
// ---------------------------------------------------------------------------

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

const legacySizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

console.log('Generating legacy SVG icons in public/ …')
for (const { name, size } of legacySizes) {
  const svg = createIconSvg(size)
  const outputPath = join(publicDir, name)
  await sharp(Buffer.from(svg)).png().toFile(outputPath)
  console.log(`  ✓ ${name} (${size}x${size})`)
}

// ---------------------------------------------------------------------------
// New: Real-icon variants in public/icons/
// ---------------------------------------------------------------------------

mkdirSync(iconsDir, { recursive: true })

const standardSizes = [192, 256, 384, 512]

console.log('\nGenerating standard icons in public/icons/ …')
for (const size of standardSizes) {
  const outputPath = join(iconsDir, `icon-${size}.png`)
  await sharp(sourceIcon).resize(size, size).png().toFile(outputPath)
  console.log(`  ✓ icon-${size}.png (${size}x${size})`)
}

// Maskable variant: 512x512 canvas with #08051A background, source icon at 80% (409px) centered
const CANVAS_SIZE = 512
const INNER_SIZE = Math.round(CANVAS_SIZE * 0.8) // 409px

console.log('\nGenerating maskable icon in public/icons/ …')
const innerBuffer = await sharp(sourceIcon).resize(INNER_SIZE, INNER_SIZE).png().toBuffer()

const maskableBuffer = await sharp({
  create: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    channels: 4,
    background: { r: 8, g: 5, b: 26, alpha: 1 }, // #08051A
  },
})
  .composite([
    {
      input: innerBuffer,
      gravity: 'center',
    },
  ])
  .png()
  .toBuffer()

const maskablePath = join(iconsDir, 'icon-512-maskable.png')
await sharp(maskableBuffer).toFile(maskablePath)
console.log(`  ✓ icon-512-maskable.png (512x512, maskable with safe-zone padding)`)

console.log('\nDone — all icons generated.')
