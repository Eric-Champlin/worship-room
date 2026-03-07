# playwright-recon

Capture the visual design, interactive behavior, and computed values of a live web page using Playwright -- producing a structured recon report that feeds into `/plan-from-jira2`.

## Usage

```bash
# External recon (replicate an external page)
/playwright-recon {URL} [output-path]

# Internal design system capture (capture YOUR app's patterns for consistency)
/playwright-recon --internal {URL-OR-URLS} [output-path]
```

**URL** (required):

- For external: The live URL to capture (e.g., `https://www.ramseysolutions.com/money/organization/turnaround-calculator`)
- For internal: One or more local URLs to capture as the design system reference (e.g., `http://localhost:5173/ http://localhost:5173/prayer-wall http://localhost:5173/daily`)

**output-path** (optional):

- Path to save the recon report (e.g., `_plans/recon/turnaround-calculator.md`)
- If not provided, defaults to `_plans/recon/{slugified-page-name}.md`
- For internal mode, defaults to `_plans/recon/design-system.md`

## Description

This command has two modes:

### External Recon Mode (default)

When a ticket says "replicate what's live" or "match the existing design," the live page IS the spec. This command visits the target URL, captures it at every breakpoint, extracts visual properties, exercises interactive elements, and produces a structured markdown report with embedded screenshot references.

The output is designed to be referenced by `/plan-from-jira2` during reconnaissance -- it provides the design context, behavioral specifications, and computed values that would otherwise require manual reverse-engineering.

### Internal Design System Mode (`--internal`)

**This is the mode that prevents endless rounds of "make this match that" UI edits.** When building new pages for your own app, this mode crawls your existing pages and extracts a comprehensive design system fingerprint: every hero gradient, heading style, card pattern, section background, button variant, spacing value, font pairing, decorative element, and responsive behavior already in use.

The output is a **Design System Reference** that serves as the single source of truth for all new page construction. When the planner or executor needs to "match the homepage hero" or "use the same card style as Prayer Wall," they reference exact computed values instead of guessing.

**Run this once when your app has established pages, then reference it in every new feature spec/plan.**

**Prerequisites:**

- Playwright is installed (`npx playwright install` if not)
- For external: The target URL is publicly accessible (or you're on VPN if it's internal)
- For internal: Your frontend dev server is running locally

**CRITICAL: This command is read-only reconnaissance. It does NOT modify any code. It does NOT commit, push, or perform any git operations.**

**CRITICAL: Every captured value must come from the actual page. Do NOT infer, assume, or fabricate design values. If a value cannot be extracted, state what's missing and suggest how to obtain it manually.**

## Instructions — Internal Design System Mode (`--internal`)

When `--internal` is specified, execute this flow instead of the external recon flow.

### Internal Step 1: Crawl All Provided Pages

Navigate to each URL provided. For each page:

1. Wait for full load (network idle + animations settled)
2. Dismiss any cookie banners or overlays
3. Take a full-page screenshot at desktop (1440px) and mobile (375px)

```text
## Pages Captured

| Page | URL | Desktop Screenshot | Mobile Screenshot |
|------|-----|--------------------|-------------------|
| Homepage | http://localhost:5173/ | screenshots/home-desktop.png | screenshots/home-mobile.png |
| Prayer Wall | http://localhost:5173/prayer-wall | screenshots/prayer-wall-desktop.png | screenshots/prayer-wall-mobile.png |
| ... | ... | ... | ... |
```

### Internal Step 2: Extract Design Tokens

Crawl ALL pages and extract every unique design token in use. These are the exact values that must be reused when building new pages.

#### 2a: Color System

Extract every unique color from all pages, categorized by usage:

```text
## Color System

### Brand Colors
| Token Name | Hex | RGB | Usage | Found On |
|-----------|-----|-----|-------|----------|
| Primary Purple | #6D28D9 | rgb(109, 40, 217) | CTA buttons, highlighted words, accent text | Homepage, Prayer Wall, Daily Hub |
| Primary Purple Dark | #4C1D95 | rgb(76, 29, 149) | Hero gradients (end color), footer background | Homepage, Prayer Wall |
| Glow Cyan | #00D4FF | rgb(0, 212, 255) | Input focus glow, AI feature indicators | Homepage hero input |
| ... | ... | ... | ... | ... |

### Background Colors
| Token Name | Hex | Usage | Found On |
|-----------|-----|-------|----------|
| Hero Gradient | linear-gradient({deg}, {color1} {stop1}, {color2} {stop2}) | Hero sections | Homepage, Prayer Wall, Local Support |
| Section Purple | {exact value} | Song Pick section, footer | Daily Hub, Pray |
| Card White | {exact value} | Content cards | All pages |
| Page Background | {exact value} | Main content area | All pages |
| ... | ... | ... | ... |

### Text Colors
| Token Name | Hex | Usage | Found On |
|-----------|-----|-------|----------|
| Heading Dark | {exact value} | H1, H2 headings | All pages |
| Body Text | {exact value} | Paragraph text | All pages |
| Muted Text | {exact value} | Subtitles, descriptions | All pages |
| ... | ... | ... | ... |
```

**CRITICAL: Extract the FULL gradient definitions, not just "purple gradient." Capture the exact CSS: `linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)` or whatever it actually is.**

#### 2b: Typography Scale

Extract every unique font style combination:

```text
## Typography Scale

### Font Families
| Family | Source | Usage |
|--------|--------|-------|
| {family} | {Google Fonts / local / CDN} | Headings, hero text |
| {family} | {Google Fonts / local / CDN} | Body text, UI elements |
| {family} | {Google Fonts / local / CDN} | Scripture, prayer text |

### Heading Styles
| Level | Font Family | Size (Desktop) | Size (Mobile) | Weight | Line Height | Color | Letter Spacing | Text Transform | Found On |
|-------|------------|----------------|---------------|--------|-------------|-------|---------------|---------------|----------|
| Hero H1 | {family} | {px} | {px} | {weight} | {value} | {hex} | {value} | {value} | Homepage |
| Page H1 | {family} | {px} | {px} | {weight} | {value} | {hex} | {value} | {value} | Prayer Wall, Local Support |
| Section H2 | {family} | {px} | {px} | {weight} | {value} | {hex} | {value} | {value} | Homepage sections |
| Card Title | {family} | {px} | {px} | {weight} | {value} | {hex} | {value} | {value} | Feature cards |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

### Body Styles
| Variant | Font Family | Size (Desktop) | Size (Mobile) | Weight | Line Height | Color | Found On |
|---------|------------|----------------|---------------|--------|-------------|-------|----------|
| Body | {family} | {px} | {px} | {weight} | {value} | {hex} | All pages |
| Body Small | {family} | {px} | {px} | {weight} | {value} | {hex} | Captions, timestamps |
| Subtitle | {family} | {px} | {px} | {weight} | {value} | {hex} | Hero subtitles |
| ... | ... | ... | ... | ... | ... | ... | ... |

### Special Text Styles
| Style | Font Family | Size | Weight | Color | Font Style | Usage | Found On |
|-------|------------|------|--------|-------|-----------|-------|----------|
| Highlighted Word | {family} | {px} | {weight} | {hex -- likely purple} | {italic?} | Purple italic word in headings ("Healing", "Heart?") | Homepage, Pray |
| Scripture Text | {family} | {px} | {weight} | {hex} | {italic?} | Bible verses, prayers | Pray, Meditate |
| ... | ... | ... | ... | ... | ... | ... | ... |
```

**CRITICAL: Capture BOTH desktop and mobile sizes. Font sizes that don't scale down on mobile are a major source of responsive bugs.**

#### 2c: Spacing System

```text
## Spacing System

### Page Layout
| Property | Desktop | Tablet | Mobile | Found On |
|----------|---------|--------|--------|----------|
| Max content width | {px} | {px} | {px} | All pages |
| Content side padding | {px} | {px} | {px} | All pages |
| Section vertical spacing | {px} | {px} | {px} | Between major sections |
| Hero vertical padding | {px} | {px} | {px} | All hero sections |

### Component Spacing
| Component | Margin (top/right/bottom/left) | Padding (top/right/bottom/left) | Gap | Found On |
|-----------|------|---------|-----|----------|
| Hero section | {values} | {values} | {value} | All pages |
| Content card | {values} | {values} | {value} | Feature cards |
| Card grid | {values} | {values} | {value} | Homepage, Meditate |
| Button (primary) | {values} | {values} | N/A | All pages |
| Button (secondary) | {values} | {values} | N/A | All pages |
| ... | ... | ... | ... | ... |
```

#### 2d: Component Pattern Library

**This is the most important section.** Extract every reusable UI pattern with exact CSS values so new pages can copy them precisely.

```text
## Component Pattern Library

### Hero Section Pattern
**Used on:** Homepage, Prayer Wall, Local Support, Pray, Journal, Meditate, Daily Hub
**Screenshot reference:** {screenshot showing a representative hero}

| Property | Value | Tailwind / CSS |
|----------|-------|---------------|
| Background | {exact gradient or color} | {exact Tailwind or inline style} |
| Min height | {px} | {value} |
| Padding top | {px} | {value} |
| Padding bottom | {px} | {value} |
| Text alignment | {value} | {value} |
| Title font | {family} {size} {weight} {color} | {exact classes} |
| Title mobile font size | {px} | {exact class} |
| Subtitle font | {family} {size} {weight} {color} | {exact classes} |
| Subtitle mobile font size | {px} | {exact class} |

**Variations found:**
- {e.g., "Homepage hero has a different gradient angle than Prayer Wall hero"}
- {e.g., "Daily Hub hero is taller because it includes Spotify embed"}

---

### Section with Dark Background Pattern (e.g., "Today's Song Pick", Footer)
**Used on:** Daily Hub, Pray, Footer
**Screenshot reference:** {screenshot}

| Property | Value | Tailwind / CSS |
|----------|-------|---------------|
| Background color | {exact hex} | {exact value} |
| Text color | {exact hex} | {exact value} |
| Heading font | {family} {size} {weight} | {exact classes} |
| Padding | {values} | {exact values} |
| Border/edge treatment | {flat / slanted / gradient fade -- describe exactly what's in use} | {CSS} |

---

### Card Pattern
**Used on:** Homepage feature cards, Daily Hub practice cards, Meditate type cards
**Screenshot reference:** {screenshot}

| Property | Value | Tailwind / CSS |
|----------|-------|---------------|
| Background | {exact value} | {value} |
| Border radius | {px} | {value} |
| Box shadow | {exact shadow value} | {value} |
| Padding | {values} | {values} |
| Hover effect | {description + CSS} | {values} |
| Border | {value or none} | {value} |

**Variations found:**
- {e.g., "Homepage cards are smaller (300px wide) vs Daily Hub cards (400px wide)"}
- {e.g., "Meditate cards have a checkmark overlay pattern"}

---

### Button Patterns
**Screenshot reference:** {screenshot showing all button variants}

| Variant | Background | Text Color | Font | Padding | Border Radius | Border | Hover State | Found On |
|---------|-----------|-----------|------|---------|--------------|--------|------------|----------|
| Primary CTA | {value} | {value} | {value} | {value} | {value} | {value} | {value} | Homepage, Pray |
| Secondary | {value} | {value} | {value} | {value} | {value} | {value} | {value} | {pages} |
| Outline/Ghost | {value} | {value} | {value} | {value} | {value} | {value} | {value} | {pages} |
| Text Link CTA | {value} | {value} | {value} | N/A | N/A | N/A | {value} | {pages} |
| Badge (e.g., Spotify) | {value} | {value} | {value} | {value} | {value} | {value} | {value} | Footer, Daily Hub |

---

### Decorative Patterns
| Pattern | Description | CSS / SVG | Found On |
|---------|-------------|-----------|----------|
| Squiggle background | {thin wavy lines behind content} | {EXACT SVG markup or CSS background value -- copy the full value, do not summarize} | Journey to Healing, Pray |
| Glow effect | {cyan glow around inputs} | {exact box-shadow value} | Homepage hero input, Pray textarea |
| Gradient fade sections | {fade in/out between sections} | {exact CSS gradient} | "See How You're Growing" |
| ... | ... | ... | ... |

**CRITICAL for decorative patterns: Copy the EXACT SVG source or CSS value. Do NOT describe it in words like "wavy lines." The whole point is that the planner/executor can paste the exact value without guessing.**

---

### Chip/Tag Pattern
| Property | Value | Tailwind / CSS | Found On |
|----------|-------|---------------|----------|
| Background | {value} | {value} | Pray starter chips |
| Border | {value} | {value} | {pages} |
| Border radius | {value} | {value} | {pages} |
| Font | {family} {size} {weight} {color} | {values} | {pages} |
| Padding | {value} | {values} | {pages} |
| Hover state | {description} | {values} | {pages} |

---

### Navigation Pattern
| Property | Desktop Value | Mobile Value | Tailwind / CSS |
|----------|-------------|-------------|---------------|
| Nav background | {value} | {value} | {value} |
| Nav height | {px} | {px} | {value} |
| Nav item font | {family} {size} {weight} {color} | {values} | {values} |
| Active item style | {description} | {description} | {values} |
| Dropdown style | {description} | N/A | {values} |
| Mobile drawer style | N/A | {description} | {values} |
| Logo size | {px} | {px} | {values} |

---

### Footer Pattern
| Property | Value | Tailwind / CSS |
|----------|-------|---------------|
| Background | {exact value} | {value} |
| Text color | {value} | {value} |
| Link color | {value} | {value} |
| Heading font | {values} | {values} |
| Body font | {values} | {values} |
| Column layout | {description} | {values} |
| Badge buttons | {description + exact styles} | {values} |
| Spotify CTA | {description + exact styles} | {values} |
| Copyright text | {values} | {values} |
| Vertical padding | {values} | {values} |
```

#### 2e: Responsive Breakpoint Behavior

```text
## Responsive Breakpoints

### Breakpoints in Use
| Name | Width | CSS Media Query |
|------|-------|----------------|
| Mobile | {px} | {exact media query from codebase} |
| Tablet | {px} | {exact media query} |
| Desktop | {px} | {exact media query} |
| ... | ... | ... |

### Layout Changes Per Breakpoint
| Component | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| Hero | {layout description} | {changes} | {changes} |
| Card grid | {e.g., "3 columns"} | {e.g., "2 columns"} | {e.g., "1 column stacked"} |
| Navigation | {e.g., "horizontal nav bar"} | {e.g., "hamburger menu"} | {e.g., "hamburger menu"} |
| Section padding | {values} | {values} | {values} |
| Font size scaling | {e.g., "H1: 48px"} | {e.g., "H1: 36px"} | {e.g., "H1: 28px"} |
| ... | ... | ... | ... |
```

#### 2f: CSS Mapping Table

**Same as external recon, but for EVERY reusable pattern.** For each design token and component property extracted above, provide the exact Tailwind class or inline style:

```text
## CSS Mapping Table — Design System

| Component | Property | Computed Value | Tailwind Class | Inline Style (if no Tailwind match) |
|-----------|----------|---------------|----------------|-------------------------------------|
| Hero section | background | linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%) | -- | style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)' }} |
| Hero H1 | font-family | Lora | font-['Lora'] | -- |
| Hero H1 | font-size | 48px | text-[48px] | -- |
| Hero H1 | font-weight | 700 | font-bold | -- |
| Hero H1 | color | #FFFFFF | text-white | -- |
| Hero subtitle | font-family | Inter | font-['Inter'] | -- |
| Hero subtitle | font-size | 18px | text-[18px] | -- |
| Primary button | background | #6D28D9 | bg-[#6D28D9] | -- |
| Primary button | color | #FFFFFF | text-white | -- |
| Primary button | padding | 12px 32px | py-3 px-8 | -- |
| Primary button | border-radius | 9999px | rounded-full | -- |
| Card | box-shadow | {exact value} | -- | style={{ boxShadow: '{exact value}' }} |
| Card | border-radius | 12px | rounded-xl | -- |
| Squiggle BG | background-image | {EXACT SVG data URI} | -- | style={{ backgroundImage: '{exact value}' }} |
| Glow effect | box-shadow | {exact value} | -- | style={{ boxShadow: '{exact value}' }} |
| ... | ... | ... | ... | ... |
```

**Mapping rules (same as external recon):**

- If a standard Tailwind class produces the EXACT computed value, use it
- If no standard class matches, use Tailwind arbitrary values with explicit px
- If Tailwind cannot express the value, provide the inline style object
- **NEVER use approximate Tailwind classes**
- **COPY decorative SVGs and complex values verbatim -- do NOT summarize or recreate**

### Internal Step 3: Cross-Page Consistency Audit

After extracting tokens from all pages, compare them and flag inconsistencies:

```text
## Cross-Page Consistency Audit

### Inconsistencies Found
| Property | Page A | Page A Value | Page B | Page B Value | Severity |
|----------|--------|-------------|--------|-------------|----------|
| Hero gradient | Homepage | linear-gradient(135deg, ...) | Prayer Wall | linear-gradient(180deg, ...) | {INTENTIONAL / BUG} |
| H1 font size | Homepage | 48px | Pray Page | 42px | {INTENTIONAL / BUG} |
| Card border-radius | Homepage | 12px | Meditate | 8px | {INTENTIONAL / BUG} |
| Squiggle SVG | Journey to Healing | {SVG A} | Pray page | {SVG B -- different!} | BUG |
| ... | ... | ... | ... | ... | ... |

### Observations
- {e.g., "All hero sections use the same gradient EXCEPT the Daily Hub which uses a slightly different end color"}
- {e.g., "The squiggle background on the Pray page uses thicker strokes than the Journey to Healing section -- likely a bug"}
- {e.g., "Footer is missing on /pray, /journal, /meditate pages"}
```

**Mark each inconsistency as INTENTIONAL (design choice) or BUG (should be fixed).** When in doubt, flag it as a potential bug.

### Internal Step 4: Generate New Page Blueprint

Based on everything captured, produce a blueprint template that any new page should follow:

```text
## New Page Blueprint

When building any new page in this app, use these exact values:

### Required Structure
1. **Navigation bar** (shared component -- do not rebuild)
2. **Hero section** -- purple gradient hero with:
   - Background: {exact gradient value}
   - Page title: {exact font specs}
   - Subtitle: {exact font specs}
   - Vertical padding: {exact values}
3. **Content section(s)** -- white background with:
   - Max width: {exact value}
   - Side padding: {exact values for each breakpoint}
4. **Optional dark section** (e.g., Song Pick) -- with:
   - Background: {exact value}
   - Heading: {exact font specs}
   - Standard padding: {exact values}
5. **Footer** (shared component -- do not rebuild)

### Copy-Paste CSS Reference
When the spec says "match the homepage hero," use EXACTLY:
{paste the complete CSS for the hero}

When the spec says "same card style as Prayer Wall," use EXACTLY:
{paste the complete CSS for the card}

When the spec says "same squiggle background," use EXACTLY:
{paste the complete SVG/CSS for the squiggle}

When the spec says "purple highlighted word" (like "Healing"), use EXACTLY:
{paste the complete CSS for the highlighted word style}

When the spec says "same glow effect as homepage input," use EXACTLY:
{paste the complete box-shadow value}
```

### Internal Step 5: Save Design System Report

Compile all findings into a single markdown file:

```bash
RECON_DIR="_plans/recon"
mkdir -p "$RECON_DIR/screenshots"
RECON_FILE="$RECON_DIR/design-system.md"
```

The report file should begin with:

```markdown
# Internal Design System Reference

**App:** {app name}
**Pages captured:** {list of URLs}
**Captured:** {YYYY-MM-DD}
**Purpose:** Single source of truth for all new page construction

---

> This report was generated by `/playwright-recon --internal` and captures the
> computed design values from all existing pages. Reference this in EVERY new
> feature spec and plan. When the spec says "match the Prayer Wall hero" or
> "use the same card style," look up the exact values here.
>
> **DO NOT guess at styles. DO NOT approximate. Copy values from this document.**

---
```

Then include all sections from Internal Steps 1-4.

Display completion:

```text
# Internal Design System Capture Complete

**Pages captured:** {N} ({list})
**Report saved to:** {RECON_FILE}
**Screenshots saved to:** {screenshot directory}

## Capture Summary
- **Design tokens extracted:** {count}
- **Component patterns documented:** {count}
- **Cross-page inconsistencies found:** {count} ({N} bugs, {N} intentional)
- **Responsive breakpoints documented:** {count}

## How to Use This Report

1. **Reference in every new spec:** Add to the top of spec files:
   `Design system reference: _plans/recon/design-system.md`

2. **Reference in every plan:** When `/plan-from-jira2` runs, it should
   load this report and use the exact CSS values for any "match existing"
   styling decisions.

3. **Reference during execution:** When `/execute-plan2` needs to style
   a hero section, card, button, or any pattern -- look up the exact
   values here instead of inspecting other components at build time.

4. **Re-run after major design changes:** If you change the hero gradient,
   add a new button variant, or update the color system, re-run
   `/playwright-recon --internal` to keep this document current.

## Consistency Issues to Fix
{list any BUG-severity inconsistencies found in the audit}
```

**STOP. Internal recon is complete.**

---

## Instructions — External Recon Mode (default)

### Step 1: Validate Access

Before capturing anything, verify the URL is accessible:

```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const response = await page.goto(URL);
```

**If the page returns non-200 or fails to load:**

```text
Error: Cannot access {URL}

HTTP status: {status code}
Error: {error message}

Possible causes:
- Page requires VPN or authentication
- URL has changed or been removed
- Network issue

Cannot proceed without a loadable page.
```

**STOP if the page is not accessible.**

**If the page loads but shows an error state, login wall, or redirect:**

- Report what the page shows
- Ask the user if this is the correct URL or if additional access is needed
- **STOP and wait for user confirmation**

### Step 2: Capture Screenshots at All Breakpoints

Take full-page screenshots at standard responsive breakpoints:

| Breakpoint | Width | Device Category |
|-----------|-------|-----------------|
| Mobile S  | 320px | Small phone     |
| Mobile M  | 375px | Standard phone  |
| Mobile L  | 425px | Large phone     |
| Tablet    | 768px | Tablet portrait |
| Laptop    | 1024px | Small laptop   |
| Desktop   | 1440px | Desktop        |
| Desktop XL | 1920px | Large desktop  |

**For each breakpoint:**

1. Set viewport to the specified width (height auto/full-page)
2. Wait for the page to be fully loaded (network idle + any animations settled)
3. Dismiss any cookie banners, modals, or overlays that obscure content
4. Take a full-page screenshot
5. Save to `_plans/recon/screenshots/{slug}-{breakpoint}.png`

```text
## Screenshots Captured

| Breakpoint | Width | File |
|-----------|-------|------|
| Mobile S  | 320px | screenshots/{slug}-mobile-s.png |
| Mobile M  | 375px | screenshots/{slug}-mobile-m.png |
| ...       | ...   | ... |
```

**If the page has multiple states** (e.g., before/after calculator submission, carousel slides):

- Capture each distinct state at the most representative breakpoint (typically Mobile L and Desktop)
- Name files descriptively: `{slug}-desktop-carousel-slide-1.png`, `{slug}-desktop-results.png`

### Step 3: Extract Visual Design Properties

For each major section/component visible on the page, extract computed styles using JavaScript evaluation:

#### 3a: Color Palette

Extract all unique colors used on the page:

```text
## Color Palette

| Usage | Hex | RGB | Element(s) |
|-------|-----|-----|-----------|
| Primary heading | #003B5C | rgb(0, 59, 92) | h1, h2 |
| Body text | #333333 | rgb(51, 51, 51) | p, li |
| Accent / CTA | #0072CE | rgb(0, 114, 206) | .btn-primary, stat numbers |
| Background (hero) | #003B5C | rgb(0, 59, 92) | .hero-section |
| Background (cards) | #FFFFFF | rgb(255, 255, 255) | .card |
| ... | ... | ... | ... |
```

#### 3b: Typography

Extract font families, sizes, weights, and line heights:

```text
## Typography

| Element | Font Family | Size | Weight | Line Height | Color | Letter Spacing |
|---------|------------|------|--------|-------------|-------|---------------|
| H1 | {family} | {px} | {weight} | {px or ratio} | {hex} | {px or normal} |
| H2 | {family} | {px} | {weight} | {px or ratio} | {hex} | {px or normal} |
| Body | {family} | {px} | {weight} | {px or ratio} | {hex} | {px or normal} |
| Button | {family} | {px} | {weight} | {px or ratio} | {hex} | {px or normal} |
| ... | ... | ... | ... | ... | ... | ... |

**Font sources:** {Google Fonts, local, CDN -- check  tags and @font-face rules}
```

#### 3c: Spacing and Layout

Extract key spacing values:

```text
## Spacing & Layout

**Page max-width:** {px}
**Content padding (mobile):** {px}
**Content padding (desktop):** {px}
**Section spacing:** {px between major sections}

**Component spacing:**
| Component | Margin | Padding | Gap (if flex/grid) |
|-----------|--------|---------|-------------------|
| Hero section | {values} | {values} | {values} |
| Card | {values} | {values} | {values} |
| CTA section | {values} | {values} | {values} |
| ... | ... | ... | ... |
```

#### 3d: CSS Mapping Table

**CRITICAL: This section bridges the gap between extracted values and implementation. For every computed style extracted in Steps 3a-3c, provide the exact Tailwind class or inline style to use. Do NOT leave translation to the planner.**

For each element with extracted styles, produce a mapping row:

```text
## CSS Mapping Table

| Element | Property | Computed Value | Tailwind Class | Inline Style (if no Tailwind match) |
|---------|----------|---------------|----------------|-------------------------------------|
| Hero heading | font-size | 34px | text-[34px] | -- |
| Hero heading | font-weight | 600 | font-semibold | -- |
| Hero heading | color | #003561 | text-[#003561] | -- |
| Hero heading | margin | 0 34px 16px | mx-[34px] mb-4 | -- |
| Card container | padding | 40px | p-10 | -- |
| Card container | border-radius | 8px | rounded-lg | -- |
| Card container | box-shadow | rgba(31,36,38,0.15) 0px 6px 16px 0px | -- | style={{ boxShadow: 'rgba(31,36,38,0.15) 0px 6px 16px 0px' }} |
| Slider thumb | width | 24px | w-[24px] | -- |
| Slider thumb | background | #0091D9 | bg-[#0091D9] | -- |
| Slider thumb | margin-top | -10px | mt-[-10px] | -- |
| ... | ... | ... | ... | ... |
```

**Mapping rules:**

- If a standard Tailwind class produces the EXACT computed value, use it (e.g., `p-10` = 40px)
- If no standard class matches, use Tailwind arbitrary values with explicit px: `text-[34px]`, `mb-[24px]`, `w-[740px]`
- If Tailwind cannot express the value (complex box-shadows, gradients, transforms), provide the inline style object
- **NEVER use approximate Tailwind classes.** `mb-6` (24px) is NOT the same as `mb-8` (32px). If the value is 24px, the mapping must produce exactly 24px.
- When rem-based Tailwind classes might compute differently due to root font size, prefer explicit px: `mt-[16px]` over `mt-4`
- For pseudo-element styles (slider thumb/track), include the full Tailwind variant: `[&::-webkit-slider-thumb]:w-[24px]`

**This mapping table is the single source of truth for implementation.** The planner and executor should copy these classes directly -- no further translation needed.

#### 3e: Component Inventory

List every distinct UI component on the page:

```text
## Component Inventory

| Component | Type | Location | Key Properties |
|-----------|------|----------|---------------|
| Hero carousel | Carousel/slider | Top of page | {N} slides, auto-rotate {yes/no}, pagination dots |
| Participation slider | Range input | Calculator section | min=0, max=100, step={N}, default={N} |
| Attendance input | Number input | Calculator section | placeholder="{text}", min/max if any |
| Results card | Card | Results section | Shows 2 stat values with labels |
| CTA button | Button | Bottom section | Text="{text}", links to "{href}" |
| ... | ... | ... | ... |
```

### Step 4: Exercise Interactive Elements

**CRITICAL: This step captures behavioral specifications -- what happens when the user interacts with the page.**

#### 4a: Identify All Interactive Elements

Scan the page for:

- Buttons (click targets)
- Form inputs (text, number, range/slider, select, checkbox, radio)
- Links (navigation)
- Carousel/slider controls (arrows, dots, swipe)
- Accordion/expandable sections
- Tabs
- Modals/dialogs triggered by user action

#### 4b: Exercise Each Interactive Element

For each interactive element, document:

```text
## Interactive Behavior

### {Component Name}: {element type}

**Element:** {CSS selector or description}
**Default state:** {initial value, appearance}

**Interactions tested:**

| Action | Input | Result | Screenshot |
|--------|-------|--------|-----------|
| {action} | {value} | {what changed on page} | {screenshot ref if captured} |
| {action} | {value} | {what changed on page} | {screenshot ref if captured} |
```

#### 4c: Calculator/Formula Reverse-Engineering

**If the page contains a calculator or any input-to-output computation:**

Run a systematic matrix of inputs and record every output. This is the most important part of the recon for replication work.

```text
## Calculator Formula Reverse-Engineering

**Inputs identified:**
- {input 1}: {name}, type={type}, range={min-max}, default={value}
- {input 2}: {name}, type={type}, range={min-max}, default={value}

**Test matrix:**

| {Input 1} | {Input 2} | {Output 1} | {Output 2} | {Output N} |
|-----------|-----------|------------|------------|------------|
| {value}   | {value}   | {result}   | {result}   | {result}   |
| {value}   | {value}   | {result}   | {result}   | {result}   |
| {value}   | {value}   | {result}   | {result}   | {result}   |
| ...       | ...       | ...        | ...        | ...        |

**Use at least 10-15 data points** spanning the full input range to enable formula derivation.

**Derived formula (if determinable):**
- {Output 1} = {formula in terms of inputs}
- {Output 2} = {formula in terms of inputs}

**Confidence:** HIGH / MEDIUM / LOW
- {explain: does the formula produce exact matches for all test points?}
- {if LOW: which data points don't fit? what's the variance?}

**Known constants (from page copy):**
- {any constants mentioned in the page text that likely feed the formula}
```

#### 4d: Carousel/Slider Behavior

**If the page contains a carousel:**

```text
## Carousel Behavior

**Total slides:** {N}
**Auto-rotate:** {yes/no}
**Auto-rotate interval:** {seconds, if applicable}
**Transition type:** {fade / slide / none}
**Transition duration:** {ms}
**Navigation:** {dots / arrows / both / swipe}
**Loop:** {yes -- wraps around / no -- stops at ends}
**Pause on hover:** {yes / no}

**Slide contents:**

| Slide | Headline | Body Text | Image/Background | CTA |
|-------|----------|-----------|-----------------|-----|
| 1 | {text} | {text} | {description or src} | {button text + href, or none} |
| 2 | {text} | {text} | {description or src} | {button text + href, or none} |
| ... | ... | ... | ... | ... |
```

### Step 5: Extract Page Assets and Resources

#### 5a: External Resources

Document what the page loads:

```text
## External Resources

**Stylesheets:**
- {URL or path}

**Scripts:**
- {URL or path}

**Fonts:**
- {font name} from {source}

**Images:**
| Image | Source URL | Dimensions | Alt Text | Location on Page |
|-------|-----------|-----------|----------|-----------------|
| {description} | {src} | {WxH} | {alt} | {where it appears} |
```

#### 5b: DOM Structure (High-Level)

Capture the semantic structure of the page:

```text
## Page Structure

```html

  
    
  
  
    
      
    
    
      <!-- computed debt/savings stats -->
    
  
  
    
  

```

**Note:** This is a simplified semantic representation, not the exact DOM. Use this for component planning.
```

### Step 6: Responsive Behavior Analysis

Compare screenshots across breakpoints and document what changes:

```text
## Responsive Behavior

| Breakpoint Change | What Changes |
|------------------|-------------|
| Desktop -> Tablet | {e.g., "2-column layout becomes single column"} |
| Tablet -> Mobile | {e.g., "Hero text size reduces, padding decreases"} |
| {breakpoint} | {change} |

**Key responsive observations:**
- {e.g., "Carousel maintains same height across all breakpoints"}
- {e.g., "Results cards stack vertically below 768px"}
- {e.g., "CTA button becomes full-width on mobile"}
```

### Step 7: Save Recon Report

Compile all findings into a single markdown file:

```bash
RECON_DIR="_plans/recon"
mkdir -p "$RECON_DIR/screenshots"
RECON_FILE="$RECON_DIR/{slug}.md"
```

The report file should begin with:

```markdown
# Playwright Recon: {page title or slug}

**Source URL:** {URL}
**Captured:** {YYYY-MM-DD}
**Purpose:** Visual and behavioral specification for replication

---

> This report was generated by `/playwright-recon` and captures the live state of the page
> at the time of capture. Reference this during `/plan-from-jira2` reconnaissance.
> Screenshots are in `_plans/recon/screenshots/`.

---
```

Then include all sections from Steps 2-6.

Save the file and display:

```text
# Playwright Recon Complete

**URL:** {URL}
**Report saved to:** {RECON_FILE}
**Screenshots saved to:** {screenshot directory}

## Capture Summary
- **Breakpoints captured:** {N} ({list})
- **Interactive states captured:** {N}
- **Calculator data points:** {N} (formula confidence: {HIGH/MEDIUM/LOW})
- **Components inventoried:** {N}
- **Carousel slides:** {N} (if applicable)

## How to Use This Report

1. Add the recon report path to your Jira ticket's Additional Notes field:
   `Playwright recon: _plans/recon/{slug}.md`

2. When running `/plan-from-jira2`, it will pick up this reference and use the
   captured specs as design context during planning.

3. Or reference it directly when running `/plan-from-jira2`:
   "See playwright recon at _plans/recon/{slug}.md for design specs"
```

**STOP. Recon is complete.**

## Examples

```bash
# ---- Internal Design System Mode ----

# Capture design system from all major pages (run once, reference forever)
/playwright-recon --internal http://localhost:5173/ http://localhost:5173/prayer-wall http://localhost:5173/daily http://localhost:5173/pray http://localhost:5173/local-support/churches

# Capture with a specific output path
/playwright-recon --internal http://localhost:5173/ http://localhost:5173/prayer-wall _plans/recon/design-system.md

# Re-run after major design changes
/playwright-recon --internal http://localhost:5173/ http://localhost:5173/prayer-wall http://localhost:5173/daily http://localhost:5173/pray http://localhost:5173/journal http://localhost:5173/meditate

# ---- External Recon Mode ----

# Capture the turnaround calculator page
/playwright-recon https://www.ramseysolutions.com/money/organization/turnaround-calculator

# Capture with a specific output path
/playwright-recon https://www.ramseysolutions.com/money/organization/turnaround-calculator _plans/recon/turnaround-calc.md

# Capture an internal page (must be on VPN)
/playwright-recon https://internal.ramseysolutions.com/dashboard
```

## Notes

**Capture Standards:**

- Every value must come from the actual page -- do NOT infer or fabricate
- Take screenshots at ALL standard breakpoints, not just the ones the user mentioned
- For calculators: use at least 10-15 data points spanning the full input range
- For carousels: capture every slide and document timing/transition behavior
- Extract computed styles (what the browser actually renders), not just CSS source values

**Internal Mode Standards:**

- Capture BOTH desktop and mobile computed values for every token -- responsive differences are the #1 source of "it looks different on my phone" bugs
- Copy decorative SVGs, complex gradients, and box-shadows VERBATIM -- the whole point is eliminating guesswork
- Flag cross-page inconsistencies -- if the squiggle on page A doesn't match page B, that's likely a bug
- The design system report should be THE reference for all new pages -- if a value isn't in the report, it shouldn't be used
- Re-run after any major design change to keep the report current
- When in doubt about whether an inconsistency is intentional or a bug, flag it as a potential bug

**Formula Reverse-Engineering:**

- Use systematic input values: edges (min, max), common values (10%, 20%, 50%), and odd values (7%, 33%)
- Test with round numbers AND non-round numbers to detect rounding behavior
- If the formula doesn't produce exact matches, report the variance -- don't force-fit
- Document any constants mentioned in the page copy (they likely feed the formula)
- If the formula cannot be determined with confidence, label it [HYPOTHESIS] and explain what additional data points would help

**Integration with Other Skills:**

- The recon report is designed to feed into `/plan-from-jira2` as design context
- Reference the report path in the Jira ticket's Additional Notes or provide it directly when running plan-from-jira2
- After implementation, use `/verify-with-playwright` (if available) to compare the built version against these captured specs

**Constraints:**

- **DO NOT** modify any code
- **DO NOT** commit, push, or perform any git operations
- **DO NOT** download or save page assets (images, fonts, scripts) -- only document their sources
- **DO NOT** interact with login forms or authentication flows
- **DO NOT** submit forms that would create real data or transactions
- **DO NOT** capture or store any PII visible on the page

**Git Operations -- HANDS OFF:**

- **DO NOT** run `git commit` under any circumstances
- **DO NOT** run `git push` under any circumstances
- **DO NOT** run `git add` under any circumstances
- The user handles ALL git operations manually

**Philosophy:** The live page is the spec. For external recon: capture everything the engineer needs to build a pixel-perfect replica without visiting the original page themselves. For internal recon: capture everything so that new pages are built with exact values from day one, eliminating rounds of "make this match that" visual fixes. Measure, don't estimate. Document, don't assume. Copy verbatim, don't recreate. If you can't extract a value programmatically, say so and suggest how to obtain it manually.

## See Also

- `/plan-from-jira2` -- Create implementation plan from Jira ticket (consumes this recon report)
- `/execute-plan2` -- Execute all steps from a generated plan
- `/verify-with-postman` -- Runtime API verification for backend endpoints