# Performance Measurement Guide

How to capture and interpret performance metrics for Worship Room.

## 1. Bundle Size Analysis

Run after any build to get a structured breakdown of chunk sizes:

```bash
cd frontend
pnpm build
node scripts/measure-bundle.mjs
```

**Output:**
- JSON to stdout (pipe to file: `node scripts/measure-bundle.mjs > bundle-report.json`)
- Human-readable table to stderr

**Key metrics to watch:**
- Main bundle (`index-*.js`) gzipped size
- Top 5 largest chunks
- Total JS+CSS+HTML gzipped
- Search index size (raw + gzip)

## 2. Playwright Performance Tests

Automated timing measurements for key user flows:

```bash
cd frontend
pnpm dev &                    # Start dev server (or use pnpm preview for prod build)
npx playwright test tests/performance/ --headed=false
```

**Flows measured:**
1. Cold load - Home page (TTFB, DOMContentLoaded, Load, LCP)
2. Home to Bible navigation
3. Bible chapter cold load (`/bible/john/3`)
4. Chapter-to-chapter navigation (John 3 -> 4)
5. Daily Hub tab switching (all 4 tabs)
6. Bible search query to results
7. My Bible page load

**Notes:**
- Results are logged to console, not asserted against thresholds
- Run against `pnpm preview` for production-representative numbers
- Run against `pnpm dev` for development iteration

## 3. Lighthouse (Manual)

Open Chrome DevTools on any page served by `pnpm preview`:

1. Open DevTools -> Lighthouse tab
2. Select **Mobile** device
3. Check: Performance, Accessibility, Best Practices, SEO
4. Under Throttling, select **Simulated throttling** (default)
5. Click **Analyze page load**

**Device profile for consistent results:**
- Mobile preset (Moto G Power)
- 4x CPU slowdown
- Slow 4G network (150ms RTT, 1.6 Mbps down, 0.75 Mbps up)

**Pages to measure:**
| Page | Route | Auth Required |
|------|-------|--------------|
| Home (logged out) | `/` | No |
| Bible Reader | `/bible/john/3` | No |
| My Bible | `/bible/my` | No |
| Daily Hub - Devotional | `/daily?tab=devotional` | No |
| Daily Hub - Pray | `/daily?tab=pray` | No |
| Daily Hub - Journal | `/daily?tab=journal` | No |
| Daily Hub - Meditate | `/daily?tab=meditate` | No |
| Settings | `/settings` | Yes |
| Bible search results | `/bible` + search | No |

## 4. Core Web Vitals

Key metrics and targets:

| Metric | Target | What it measures |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Loading performance |
| INP (Interaction to Next Paint) | < 200ms | Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | Visual stability |
| TBT (Total Blocking Time) | < 200ms | Main thread blocking |
| TTFB (Time to First Byte) | < 800ms | Server response |

## 5. Interpreting Results

### Before/After Comparison

When measuring the impact of an optimization:

1. Capture baseline **before** the change (same device, same network, same server)
2. Apply the change
3. Run `pnpm build` for a fresh production build
4. Capture the same metrics **after**
5. Compare in a table with delta column

### Variability

Lighthouse scores can vary +-5 points between runs. For reliable comparison:
- Run 3 times and take the median
- Use the same machine state (close other tabs, same battery/power state)
- Use `pnpm preview` (not `pnpm dev`) for production-representative numbers

### Red Flags

- Main bundle > 120 KB gzipped
- Any single chunk > 200 KB gzipped (except Recharts which is vendor-isolated)
- Lighthouse Performance < 85 on mobile
- LCP > 3.0s on mobile
- CLS > 0.15
- Service worker precache > 5 MB gzipped
