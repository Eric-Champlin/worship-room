import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'playwright-screenshots')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  bypassCSP: true,
})
const page = await context.newPage()

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: join(outDir, 'favicon-check-home.png'), fullPage: false })

// Fetch the favicon binary the browser would load, save as separate artifact
const iconResponse = await page.goto('http://localhost:5173/icon-192.png', { waitUntil: 'networkidle' })
const iconBuffer = await iconResponse.body()
const { writeFileSync } = await import('fs')
writeFileSync(join(outDir, 'favicon-check-icon-192-served.png'), iconBuffer)

await browser.close()
console.log('Screenshots saved to', outDir)
