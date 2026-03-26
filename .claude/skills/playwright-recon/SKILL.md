---
description: Capture visual design, interactive behavior, and computed values of a live web page using Playwright — external recon for replication or --internal for design system capture
argument-hint: URL(s) to capture, optionally output path (e.g. https://example.com/page, --internal http://localhost:5173/ http://localhost:5173/prayer-wall)
user-invokable: true
---

# playwright-recon
 
Capture the visual design, interactive behavior, and computed values of a live web page using Playwright — producing a structured recon report that feeds into `/plan`.
 
## Usage
 
```bash
# External recon (replicate an external page)
/playwright-recon {URL} [output-path]
 
# Internal design system capture (capture YOUR app's patterns for consistency)
/playwright-recon --internal {URL-OR-URLS} [output-path]
```
 
**URL** (required):
 
- For external: The live URL to capture (e.g., `https://example.com/page`)
- For internal: One or more local URLs to capture as the design system reference (e.g., `http://localhost:5173/ http://localhost:5173/prayer-wall http://localhost:5173/daily`)
 
**output-path** (optional):
 
- Path to save the recon report (e.g., `_plans/recon/some-page.md`)
- If not provided, defaults to `_plans/recon/{slugified-page-name}.md`
- For internal mode, defaults to `_plans/recon/design-system.md`
 
## Description
 
This command has two modes:
 
### External Recon Mode (default)
 
When a reference page needs to be captured or replicated, the live page IS the spec. This command visits the target URL, captures it at every breakpoint, extracts visual properties, exercises interactive elements, and produces a structured markdown report with embedded screenshot references.
 
The output is designed to be referenced by `/plan` during reconnaissance — it provides the design context, behavioral specifications, and computed values that would otherwise require manual reverse-engineering.
 
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
| Highlighted Word | {family} | {px} | {weight} | {hex — likely purple} | {italic?} | Purple italic word in headings ("Healing", "Heart?") | Homepage, Pray |
| Scripture Text | {family} | {px} | {weight} | {hex} | {italic?} | Bible verses, prayers | Pray, Meditate |
| ... | ... | ... | ... | ... | ... | ... | ... |
```
 
**CRITICAL: Capture BOTH desktop and mobile sizes. Font sizes that don't scale down on mobile are a major source of responsive bugs.**
 
**CRITICAL: For multi-font treatments (e.g., a heading where part is in a script font like Caveat and part is in a standard font), capture BOTH fonts separately and document how it's implemented (separate `<span>` elements? Different component?).**
 
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
| Border/edge treatment | {flat / slanted / gradient fade — describe exactly what's in use} | {CSS} |
 
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
| Min height | {value or "none"} | {value} |
| Max width | {value or "none"} | {value} |
 
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
 
**CRITICAL: Capture hover state computed values for every button variant by using `page.hover()`.** Do NOT write "TBD" or "likely darkens" — extract the actual value or write "no change" with evidence.
 
---
 
### Decorative Patterns
| Pattern | Description | CSS / SVG | Found On |
|---------|-------------|-----------|----------|
| Squiggle background | {thin wavy lines behind content} | {EXACT SVG markup or CSS background value — copy the full value, do not summarize} | Journey to Healing, Pray |
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
- **COPY decorative SVGs and complex values verbatim — do NOT summarize or recreate**
 
#### 2g: Vertical Rhythm
 
**Measure the vertical gap between every pair of adjacent sections/components on each page:**
 
```text
## Vertical Rhythm
 
### {Page Name}
| From → To | Gap (px) | How Achieved |
|-----------|----------|--------------|
| Hero → first section | {px} | {margin-bottom on hero / padding-top on section} |
| Section 1 → Section 2 | {px} | {value} |
| ... | ... | ... |
```
 
**If any gap differs by more than 5px between pages for the same transition (e.g., hero → first section), flag as an inconsistency.**
 
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
| Squiggle SVG | Journey to Healing | {SVG A} | Pray page | {SVG B — different!} | BUG |
| ... | ... | ... | ... | ... | ... |
 
### Observations
- {e.g., "All hero sections use the same gradient EXCEPT the Daily Hub which uses a slightly different end color"}
- {e.g., "The squiggle background on the Pray page uses thicker strokes than the Journey to Healing section — likely a bug"}
- {e.g., "Footer is missing on /pray, /journal, /meditate pages"}
```
 
**Mark each inconsistency as INTENTIONAL (design choice) or BUG (should be fixed).** When in doubt, flag it as a potential bug.
 
### Internal Step 4: Generate New Page Blueprint
 
Based on everything captured, produce a blueprint template that any new page should follow:
 
```text
## New Page Blueprint
 
When building any new page in this app, use these exact values:
 
### Required Structure
1. **Navigation bar** (shared component — do not rebuild)
2. **Hero section** — purple gradient hero with:
   - Background: {exact gradient value}
   - Page title: {exact font specs}
   - Subtitle: {exact font specs}
   - Vertical padding: {exact values}
3. **Content section(s)** — white background with:
   - Max width: {exact value}
   - Side padding: {exact values for each breakpoint}
4. **Optional dark section** (e.g., Song Pick) — with:
   - Background: {exact value}
   - Heading: {exact font specs}
   - Standard padding: {exact values}
5. **Footer** (shared component — do not rebuild)
 
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
 
### Internal Step 5: Self-Verification (before saving)
 
**Before saving the report, verify completeness:**
 
```text
## Recon Completeness Checklist
 
- [ ] All provided pages captured at desktop and mobile
- [ ] Color system extracted (brand, background, text)
- [ ] Typography scale extracted (headings, body, special styles)
- [ ] Multi-font treatments documented separately (e.g., Caveat vs Lora in same heading)
- [ ] Spacing system extracted (page layout + component spacing)
- [ ] ALL component patterns documented with exact CSS values
- [ ] Decorative patterns copied VERBATIM (no summarizing SVGs)
- [ ] Hover states extracted with actual computed values (no "TBD")
- [ ] Responsive breakpoints documented with layout changes
- [ ] CSS Mapping Table complete for all tokens
- [ ] Vertical rhythm measured between all adjacent sections
- [ ] Cross-page consistency audit complete
- [ ] New page blueprint generated
- [ ] Inconsistencies flagged as INTENTIONAL or BUG
 
**If any checkbox is unchecked, go back and capture the missing data.**
```
 
### Internal Step 6: Save Design System Report
 
Compile all findings into a single markdown file:
 
```bash
RECON_DIR="_plans/recon"
mkdir -p "$RECON_DIR/screenshots"
RECON_FILE="$RECON_DIR/design-system.md"
```
 
The report file should begin with:
 
```markdown
# Internal Design System Reference
 
**App:** Worship Room
**Pages captured:** {list of URLs}
**Captured:** {YYYY-MM-DD}
**Capture age:** {0 days — fresh}
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
- **Vertical rhythm tables:** {count}
 
## How to Use This Report
 
1. **Reference in every new spec:** Add to the top of spec files:
   `Design system reference: _plans/recon/design-system.md`
 
2. **Reference in every plan:** When `/plan` runs, it should
   load this report and use the exact CSS values for any "match existing"
   styling decisions.
 
3. **Reference during execution:** When `/execute-plan` needs to style
   a hero section, card, button, or any pattern — look up the exact
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
 
### Step 2: Screen Discovery & Inventory
 
**CRITICAL: Before capturing anything, navigate through the ENTIRE flow from start to finish and document every distinct screen. This step prevents miscounting screens and ensures every screen in the flow gets captured.**
 
**Definition of "screen":** A screen is a distinct UI state that replaces the primary content area. Overlays, modals, expandable sections, and tooltip popovers within the same viewport are NOT separate screens — they are interactive states of the current screen.
 
**Distinguishing screens from within-screen state changes:**
 
- If the primary user action replaces the main content area with entirely new content → **new screen**
- If the action reveals additional content within the same layout (accordion, modal, tooltip) → **same screen, new state**
- If the action scrolls to a different section → **same screen**
 
**Process:**
 
1. Start at the initial page load state
2. Perform the primary user action to advance (fill required inputs, click the primary CTA)
3. At each new screen, record: screen number, name, how you got there, key content, shared elements
4. Continue until terminal state
5. Count the total screens
 
**Screen Inventory Table:**
 
```text
## Screen Inventory
 
**Total screens:** {N}
**Flow type:** {wizard / carousel / tabbed / accordion / single page}
**Terminal state:** {what the last screen shows or does}
 
| # | Screen Name | Navigation to Reach | Key Content | Shared Elements |
|---|------------|-------------------|-------------|-----------------|
| 1 | {name}     | Page load          | {content}   | {hero, dots, gradient} |
| 2 | {name}     | {exact action from S1} | {content} | {shared elements} |
```
 
**Display to user for confirmation:**
 
```text
I found {N} screens in this flow. Here's my inventory:
 
{table}
 
Does this match your understanding? (yes / correct me)
```
 
**WAIT for user confirmation before proceeding.**
 
**Also test navigation behavior:**
 
```text
**Navigation behavior:**
- Forward: {how — CTA button, auto-advance, etc.}
- Backward: {possible / not possible — method}
- Random access: {possible / not possible — method}
- State preservation on back: {yes / no / partial}
```
 
### Step 3: Capture Screenshots at All Breakpoints
 
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
 
**For multi-screen flows:** Capture EVERY screen at Mobile M (375px) and Desktop (1440px) at minimum. Name files with screen identifier: `{slug}-desktop-screen1.png`
 
**If the page has multiple states within a screen** (e.g., before/after submission, conditional fields):
 
- Capture each distinct state at Mobile M and Desktop
- Name files descriptively: `{slug}-desktop-screen3-other-selected.png`
 
### Step 4: Per-Screen Component Audit
 
**CRITICAL: Do this BEFORE extracting CSS values. Enumerate every visible component first so nothing gets missed.**
 
**For EACH screen**, navigate to it and enumerate every visible component:
 
- Any box with background, border, shadow, or visual boundary = **Card**
- Any visible text with distinct styling = **Text**
- Any wrapper div constraining content = **Section**
- Any clickable action element = **Button**
- Any `<img>` or `<picture>` = **Image**
- Any `<a>` tag in body content = **Link**
 
```text
## Per-Screen Component Audit
 
### Screen {N}: {name}
**Navigation to reach:** {e.g., "Click CTA → fill form → submit"}
 
**Components found:**
| # | Component Description | Component Type | Mandatory Table Needed |
|---|----------------------|---------------|----------------------|
| 1 | {e.g., "Hero heading"} | Text | Text table |
| 2 | {e.g., "Feature card"} | Card | Card table |
| ... | ... | ... | ... |
```
 
**After all audits, produce a gate check:**
 
```text
## Component Audit Summary
 
**Total screens audited:** {N}
**Total components found:** {N}
**Mandatory tables needed:** {N}
 
This count is the target for the Self-Verification checklist.
```
 
### Step 5: Extract Visual Design Properties
 
For each major component, extract computed styles using JavaScript evaluation.
 
#### 5a: Color Palette
 
```text
## Color Palette
 
| Usage | Hex | RGB | Element(s) |
|-------|-----|-----|-----------|
| Primary heading | {hex} | {rgb} | {selectors} |
| ... | ... | ... | ... |
```
 
#### 5b: Typography
 
```text
## Typography
 
| Element | Font Family | Size | Weight | Line Height | Color | Letter Spacing |
|---------|------------|------|--------|-------------|-------|---------------|
| H1 | {family} | {px} | {weight} | {value} | {hex} | {value} |
| ... | ... | ... | ... | ... | ... | ... |
 
**Font sources:** {Google Fonts, local, CDN}
```
 
**For multi-font treatments, capture BOTH fonts separately.**
 
#### 5c: Spacing and Layout
 
```text
## Spacing & Layout
 
**Page max-width:** {px}
**Content padding (mobile):** {px}
**Content padding (desktop):** {px}
**Section spacing:** {px between major sections}
```
 
#### 5d: CSS Mapping Table
 
**CRITICAL: For every computed style extracted, provide the exact Tailwind class or inline style.**
 
Use the **exhaustive property checklist** for every component:
 
- Dimensions: width, height, max-width, min-width, max-height, min-height
- Spacing: padding (all sides), margin (all sides), gap
- Borders: border-top/right/bottom/left (commonly missed decorative borders!), border-radius, border-color
- Background: background-color, background-image
- Typography: font-size, font-weight, font-family, font-style, line-height, color, text-align, text-transform, letter-spacing, text-decoration
- Layout: display, flex-direction, align-items, justify-content, flex-wrap, flex-grow, overflow, position
- Effects: box-shadow, opacity, transform, transition
 
**Only omit a property if its value is the browser default.** If a property has ANY non-default value, include it. When in doubt, include it.
 
**Pay special attention to commonly-missed properties:**
- `border-left` / `border-right` — decorative accent borders on cards
- `min-height` — cards that maintain minimum height
- `max-width` on inner content elements
- `box-shadow` — subtle shadows distinguishing cards from flat backgrounds
- `text-transform` — uppercase headings
- `letter-spacing` — often paired with text-transform
- `font-style: italic` — commonly missed on captions, emphasis text
 
#### Mandatory Per-Component Tables
 
**For every component in the audit, produce the corresponding table with EVERY cell filled. Write "none" or "default" for browser defaults — do NOT leave cells blank.**
 
**For every CARD:**
 
```text
### Card: {name} (Screen {N})
| Property | Value | Tailwind Class |
|----------|-------|----------------|
| width | {value} | |
| height | {value} | |
| min-height | {value or "none"} | |
| max-width | {value or "none"} | |
| padding (all sides) | {values} | |
| margin-top | {value} | |
| margin-bottom | {value} | |
| background-color | {value} | |
| border-radius | {value} | |
| border-top/right/bottom/left | {values or "none"} | |
| box-shadow | {value or "none"} | |
| display | {value} | |
| flex-direction | {value or "N/A"} | |
| gap | {value or "N/A"} | |
```
 
**For every TEXT element:**
 
```text
### Text: {description} (Screen {N})
| Property | Value | Tailwind Class |
|----------|-------|----------------|
| font-size | {value} | |
| font-weight | {value} | |
| font-family | {value} | |
| font-style | {value or "normal"} | |
| line-height | {value} | |
| color | {value} | |
| text-align | {value} | |
| text-transform | {value or "none"} | |
| letter-spacing | {value or "normal"} | |
| max-width | {value or "none"} | |
| margin-top/bottom | {values} | |
```
 
**For every BUTTON:**
 
```text
### Button: {label} (Screen {N})
| Property | Value | Tailwind Class |
|----------|-------|----------------|
| width | {value} | |
| height | {value} | |
| padding (all sides) | {values} | |
| font-size | {value} | |
| font-weight | {value} | |
| color | {value} | |
| background-color | {value} | |
| border | {value or "none"} | |
| border-radius | {value} | |
| cursor | {value} | |
```
 
**For every interactive element — States table:**
 
```text
### States: {element name} (Screen {N})
| State | Property | Value | Tailwind Class |
|-------|----------|-------|----------------|
| :hover | background-color | {value} | hover:bg-[{value}] |
| :hover | color | {value or "same"} | |
| :hover | box-shadow | {value or "same"} | |
| :focus | outline | {value} | |
| :focus | border-color | {value or "same"} | |
```
 
**CRITICAL: Extract actual computed values using `page.hover()` and `page.focus()`.** Do NOT write "TBD" or "likely darkens." If extraction fails, write "no change" with evidence.
 
**For every GRADIENT background:**
 
```text
### Gradient: {element} (Screen {N})
| Property | Value |
|----------|-------|
| background-image (full) | {exact CSS gradient string} |
| gradient angle | {deg} |
| color stop 1 | {color} at {position} |
| color stop 2 | {color} at {position} |
| visual cutoff position | {where the transition occurs} |
```
 
**For every IMAGE:**
 
```text
### Image: {alt/description} (Screen {N})
| Property | Value |
|----------|-------|
| rendered width | {px} |
| rendered height | {px} |
| max-width | {value or "none"} |
| src | {URL} |
| alt | {text} |
```
 
**For every LINK in body content:**
 
```text
### Link: {text} in {parent} (Screen {N})
| Property | Value | Tailwind Class |
|----------|-------|----------------|
| color | {value} | |
| text-decoration | {value} | |
| font-style | {value} | |
| href | {URL} | |
| target | {_self / _blank} | |
| hover color | {value or "same"} | |
| hover text-decoration | {value or "same"} | |
```
 
**Links inventory for elements with multiple links:**
 
```text
### Links inventory: {parent element} (Screen {N})
| # | Link Text | href | target | Styled? |
|---|-----------|------|--------|---------|
| 1 | {text} | {URL} | {_self / _blank} | {yes — underlined / no — plain text} |
```
 
**For every text block — check for intra-element style variations:**
 
A single paragraph or text container often has mixed formatting — a bold opening phrase, italic body text, and styled inline links all within one `<p>` or `<div>`. Scan every text block's children for tags that modify styling:
 
```text
### Text Variations Within: {element name} (Screen {N})
| Region | Tag | Font Style | Font Weight | Color | Evidence |
|--------|-----|-----------|-------------|-------|----------|
| Opening phrase | <strong> | normal | 700 | {hex} | "About the Stats:" is bold |
| Body text | <em> | italic | 400 | {hex} | Body wrapped in <em> |
| Inline link | <a><em> | italic | 400 | {hex} | Link text is italic |
```
 
If no intra-element variations exist on this element, skip it.
 
**Form Responsive Widths (if forms present):**
 
If the page contains form elements, capture form container and input widths at EVERY breakpoint:
 
```text
### Form Responsive Widths (Screen {N})
| Breakpoint | Element | Property | Value | Constraint Method |
|-----------|---------|----------|-------|-------------------|
| 375px | form container | width | {px} | {e.g., "max-width on form element"} |
| 375px | input | width | {px} | {e.g., "inherits from form max-width"} |
| 768px | form container | width | {px} | {method} |
| 768px | input | width | {px} | {method} |
| 1440px | form container | width | {px} | {method} |
| 1440px | input | width | {px} | {method} |
```
 
The "Constraint Method" column documents HOW the width is constrained — this tells the implementer WHERE to put the width (on the form container, on the inputs, or on a parent). Without this, "full width" is ambiguous.
 
If no forms on the page, skip this table.
 
**Vertical Rhythm per screen:**
 
```text
### Vertical Rhythm (Screen {N})
| From → To | Gap (px) | How Achieved |
|-----------|----------|--------------|
| Hero → section 1 | {px} | {margin/padding} |
| Section 1 → section 2 | {px} | {value} |
```
 
**Spacing gaps between sibling components:**
 
```text
**Vertical Rhythm row count enforcement:** After completing the Vertical Rhythm table for a screen, count the visible component boundaries in the screenshot from top to bottom. If you can see N distinct components/sections stacked vertically, the table must have at least N-1 rows (one gap per adjacent pair). Display the count check:
 
```text
**Vertical Rhythm row count check (Screen {N}):**
- Visible component boundaries (top to bottom): {N} (list: hero, subtitle, content section, ...)
- Expected minimum rows: {N-1}
- Actual rows in table: {N}
- **{PASS: rows >= expected / FAIL: {X} rows missing — go back and add them}**
```
 
**If the count check fails, add the missing rows before proceeding.**
 
### Spacing: {component A} → {component B} (Screen {N})
| Measurement | Value | How Achieved |
|-------------|-------|--------------|
| Visual gap | {px} | {margin-bottom on A / margin-top on B / gap / padding} |
```
 
**Mapping rules:**
 
- If a standard Tailwind class produces the EXACT computed value, use it (e.g., `p-10` = 40px)
- If no standard class matches, use Tailwind arbitrary values with explicit px: `text-[34px]`, `mb-[24px]`
- If Tailwind cannot express the value (complex box-shadows, gradients), provide the inline style object
- **NEVER use approximate Tailwind classes.** `mb-6` (24px) is NOT the same as `mb-8` (32px).
- When rem-based Tailwind classes might compute differently due to root font size, prefer explicit px
- For pseudo-element styles, include the full Tailwind variant
 
### Step 6: Exercise Interactive Elements
 
#### 6a: Identify All Interactive Elements
 
Scan the page for: buttons, form inputs, links, carousel/slider controls, accordions, tabs, modals.
 
#### 6b: Exercise Each Interactive Element
 
```text
## Interactive Behavior
 
### {Component Name}: {element type}
 
**Element:** {CSS selector or description}
**Default state:** {initial value, appearance}
 
**Interactions tested:**
 
| Action | Input | Result | Screenshot |
|--------|-------|--------|-----------|
| {action} | {value} | {what changed} | {screenshot ref} |
```
 
#### 6c: Conditional/Dynamic Content Detection
 
**Scan the DOM for hidden elements that may appear conditionally:**
 
```text
## Conditional/Dynamic Content
 
| Element | Initial State | Trigger | What Appears | Screen |
|---------|--------------|---------|--------------|--------|
| {selector} | hidden | {e.g., "Select 'Other' in dropdown"} | {description} | {N} |
| {selector} | hidden | {e.g., "Submit with empty fields"} | {validation errors} | {N} |
```
 
**Test each conditional trigger and capture the revealed content's styles.**
 
#### 6d: Calculator/Formula Reverse-Engineering
 
**If the page contains a calculator or any input-to-output computation:**
 
```text
## Calculator Formula Reverse-Engineering
 
**Inputs identified:**
- {input 1}: {name}, type={type}, range={min-max}, default={value}
 
**Test matrix:**
 
| {Input 1} | {Input 2} | {Output 1} | {Output 2} |
|-----------|-----------|------------|------------|
| {value}   | {value}   | {result}   | {result}   |
| ...       | ...       | ...        | ...        |
 
**Use at least 10-15 data points** spanning the full input range.
 
**Derived formula (if determinable):**
- {Output 1} = {formula}
 
**Confidence:** HIGH / MEDIUM / LOW
```
 
#### 6e: Animation and Transition Behavior
 
```text
## Animation & Transition Behavior
 
### {Element Name}
 
**Update behavior:** {instant | animated counter | fade | slide | other}
**If animated:**
- Duration: {ms}
- Easing: {linear / ease-in / ease-out / custom}
**Debounce/throttle:** {none | Nms debounce}
**Evidence:** {description of observed behavior}
```
 
#### 6f: Carousel/Slider Behavior
 
**If the page contains a carousel:**
 
```text
## Carousel Behavior
 
**Total slides:** {N}
**Auto-rotate:** {yes/no}
**Auto-rotate interval:** {seconds, if applicable}
**Transition type:** {fade / slide / none}
**Transition duration:** {ms}
**Navigation:** {dots / arrows / both / swipe}
**Dot navigation clickable:** {yes — can jump to any screen / no — indicators only}
**Loop:** {yes / no}
**Pause on hover:** {yes / no}
 
**Slide contents:**
 
| Slide | Headline | Body Text | Image/Background | CTA |
|-------|----------|-----------|-----------------|-----|
| 1 | {text} | {text} | {description or src} | {button text + href, or none} |
```
 
### Step 7: Extract Page Assets and Resources
 
#### 7a: External Resources
 
```text
## External Resources
 
**Stylesheets:** {list}
**Scripts:** {list}
**Fonts:** {list with sources}
 
**Images:**
| Image | Source URL | Dimensions | Alt Text | Location on Page | Screen |
|-------|-----------|-----------|----------|-----------------|--------|
| {description} | {src} | {WxH} | {alt} | {where} | {N} |
```
 
#### 7b: DOM Structure (High-Level)
 
```text
## Page Structure
 
{simplified semantic HTML representation}
 
**Note:** This is a simplified semantic representation for component planning.
```
 
### Step 8: Responsive Behavior Analysis
 
#### 8a: Detect Responsive Strategy
 
Extract actual CSS media queries:
 
```text
## Responsive Strategy
 
**Approach:** {mobile-first / desktop-first / mixed / container queries / fluid}
**Breakpoints detected:**
| Breakpoint | Media Query | Pixel Value | Purpose |
|-----------|-------------|-------------|----------|
| {name} | min-width: {value} | {px} | {what changes} |
```
 
#### 8b: Document What Changes at Each Breakpoint
 
For every component, visit each breakpoint and extract computed styles that CHANGE:
 
```text
## Responsive Behavior by Component
 
### Base Styles (Mobile)
| Component | Property | Value |
|-----------|----------|-------|
| {component} | flex-direction | column |
| ... | ... | ... |
 
### Breakpoint: min-width {N}px
| Component | Property | Changes From | Changes To |
|-----------|----------|-------------|------------|
| {component} | flex-direction | column | row |
| ... | ... | ... | ... |
```
 
#### 8c: Component Visibility Swaps
 
```text
## Component Visibility Swaps
 
| Component (Mobile) | Component (Desktop) | Swap Breakpoint | Method |
|-------------------|--------------------|-----------------|---------|
| {narrow version} | {wide version} | {N}px | display: none / block |
```
 
#### 8d: Responsive CSS Mapping Table
 
```text
## Responsive CSS Mapping Table
 
| Element | Property | Mobile Value | Mobile Class | Desktop Value | Desktop Class |
|---------|----------|-------------|-------------|---------------|--------------|
| {elem} | flex-direction | column | flex-col | row | md:flex-row |
| ... | ... | ... | ... | ... | ... |
 
**Tailwind breakpoint mapping:**
| Prod Breakpoint | Nearest Tailwind Prefix | Exact Match? |
|----------------|------------------------|--------------|
| {N}px | sm / md / lg | YES / NO — use min-[{N}px]: |
```
 
**If prod breakpoints don't match standard Tailwind breakpoints, document the mismatch and provide correct arbitrary syntax. Do NOT silently map to the nearest standard breakpoint.**
 
### Step 9: Text Content Snapshot
 
**For every screen, capture the actual rendered text of key elements:**
 
```text
## Text Content Snapshot
 
### Screen {N}: {name}
 
| Element | Selector | Text Content |
|---------|---------|--------------|
| H1 heading | h1 | "{exact text}" |
| Subtitle | p below heading | "{exact text}" |
| Button label | button | "{exact text}" |
| ... | ... | ... |
```
 
**Capture rendered text via `textContent`, not `innerHTML`.** This is consumed by `/verify-with-playwright` for text content verification.
 
### Step 10: Self-Verification (before saving)
 
**Before saving, verify completeness:**
 
```text
## Recon Completeness Checklist
 
### Global
- [ ] Screen Inventory completed and confirmed by user
- [ ] All 7 standard breakpoints captured
- [ ] Component Audit Summary gate check: {N} mandatory tables expected
 
### Per Screen {N}: {name}
- [ ] Desktop + Mobile screenshots captured
- [ ] Per-Screen Component Audit complete
- [ ] Every component has a mandatory table with ALL cells filled
- [ ] States tables for every interactive element (no "TBD" values)
- [ ] Gradient tables (if gradients exist)
- [ ] Image tables (if images exist)
- [ ] Link tables + inventory (if links in body content)
- [ ] Vertical Rhythm table
- [ ] Text Content Snapshot
 
### Responsive
- [ ] Actual CSS media queries extracted
- [ ] Property changes documented at each breakpoint
- [ ] Breakpoints mapped to Tailwind prefixes
- [ ] Key layout shifts documented
 
### Final Count
- [ ] Expected mandatory tables: {N}
- [ ] Actual mandatory tables: {N}
- [ ] **Missing: {list or "none"}**
 
**If any checkbox is unchecked, go back and capture the missing data.**
```
 
### Step 11: Save Recon Report
 
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
**Capture age:** {0 days — fresh}
**Purpose:** Visual and behavioral specification for replication
**Screens:** {N} ({list of screen names})
**Confidence:** {HIGH / MEDIUM / LOW}
 
---
 
> This report was generated by `/playwright-recon` and captures the live state of the page
> at the time of capture. Reference this during `/plan` reconnaissance.
> Screenshots are in `_plans/recon/screenshots/`.
>
> **Staleness warning:** `/plan` checks this report's capture date. If the report
> is older than 30 days or missing pages the spec references, it will flag staleness.
> Re-run `/playwright-recon` to refresh.
 
---
```
 
Then include all sections from Steps 2-9.
 
**Plan Handoff Checklist:**
 
```text
## Plan Handoff Checklist
 
| Section | Present? | Used By /plan For | Also Used By |
|---------|----------|-------------------|
| Screen Inventory | {YES/NO} | Understanding flow structure | /verify-with-playwright |
| Per-Screen Component Audit | {YES/NO} | Ensuring plan covers every component | — |
| CSS Mapping Table (per component) | {YES/NO} | Exact Tailwind classes for every step | /execute-plan, /verify-with-playwright |
| Gradient tables | {YES/NO} | Exact gradient strings | /verify-with-playwright |
| Vertical Rhythm tables | {YES/NO} | Spacing between sections | /execute-plan, /verify-with-playwright |
| Image tables | {YES/NO} | Image dimensions | /verify-with-playwright |
| Link inventory tables | {YES/NO} | Ensuring links are `<a>` tags with correct styling | /verify-with-playwright |
| States tables (hover/focus) | {YES/NO} | Tailwind hover:/focus: variants | /verify-with-playwright |
| Conditional/dynamic content | {YES/NO} | Conditional render logic | — |
| Responsive CSS Mapping Table | {YES/NO} | Mobile-first implementation | /execute-plan |
| Text Content Snapshot | {YES/NO} | Text content verification | /verify-with-playwright |
| Form Responsive Widths | {YES/NO} | Per-breakpoint form constraint | /verify-with-playwright |
| Intra-element text variations | {YES/NO} | Mixed-formatting HTML tags | /verify-with-playwright |
```
 
Save the file and display:
 
```text
# Playwright Recon Complete
 
**URL:** {URL}
**Report saved to:** {RECON_FILE}
**Screenshots saved to:** {screenshot directory}
 
## Capture Summary
- **Screens discovered:** {N} (confirmed by user)
- **Breakpoints captured:** {N} ({list})
- **Interactive states captured:** {N}
- **Components inventoried:** {N}
- **Mandatory tables produced:** {N} of {N} expected
 
## How to Use This Report
 
1. Reference this when running `/plan`:
   "See playwright recon at _plans/recon/{slug}.md for design specs"
 
2. After implementation, use `/verify-with-playwright` to compare
   the built version against these captured specs.
```
 
**STOP. Recon is complete.**
 
## Examples
 
```bash
# ---- Internal Design System Mode ----
 
# Capture design system from all major pages
/playwright-recon --internal http://localhost:5173/ http://localhost:5173/prayer-wall http://localhost:5173/daily http://localhost:5173/pray http://localhost:5173/local-support/churches
 
# Capture with a specific output path
/playwright-recon --internal http://localhost:5173/ http://localhost:5173/prayer-wall _plans/recon/design-system.md
 
# Re-run after major design changes
/playwright-recon --internal http://localhost:5173/ http://localhost:5173/prayer-wall http://localhost:5173/daily http://localhost:5173/pray http://localhost:5173/journal http://localhost:5173/meditate
 
# ---- External Recon Mode ----
 
# Capture an external page
/playwright-recon https://example.com/some-page
 
# Capture with a specific output path
/playwright-recon https://example.com/some-page _plans/recon/some-page.md
```
 
## Notes
 
**Capture Standards:**
 
- Every value must come from the actual page — do NOT infer or fabricate
- Take screenshots at ALL standard breakpoints, not just the ones the user mentioned
- For calculators: use at least 10-15 data points spanning the full input range
- For carousels: capture every slide and document timing/transition behavior
- Extract computed styles (what the browser actually renders), not just CSS source values
 
**Screen Discovery:**
 
- Always validate the screen count with the user before capturing
- Do not assume screen boundaries from visual similarity — test by performing user actions
- Later screens in a flow are commonly under-documented — be thorough
 
**Internal Mode Standards:**
 
- Capture BOTH desktop and mobile computed values for every token
- Copy decorative SVGs, complex gradients, and box-shadows VERBATIM
- Flag cross-page inconsistencies — if the squiggle on page A doesn't match page B, that's likely a bug
- The design system report should be THE reference for all new pages
- Re-run after any major design change to keep the report current
 
**Formula Reverse-Engineering:**
 
- Use systematic input values: edges (min, max), common values (10%, 20%, 50%), and odd values (7%, 33%)
- Test with round numbers AND non-round numbers to detect rounding behavior
- If the formula doesn't produce exact matches, report the variance
- If the formula cannot be determined with confidence, label it [HYPOTHESIS]
 
**Integration with Other Skills:**
 
- The recon report feeds into `/plan` as design context. `/plan` checks the capture date and flags reports older than 30 days
- After implementation, `/verify-with-playwright` compares the built version against these specs
- `/verify-with-playwright` auto-detects the Source URL from this report for `--compare-prod` mode
- `/verify-with-playwright` auto-detects the Source URL from this report for `--compare-prod` mode
- The Plan Handoff Checklist lists every section downstream skills consume
 
**Constraints:**
 
- **DO NOT** modify any code
- **DO NOT** commit, push, or perform any git operations
- **DO NOT** download or save page assets — only document their sources
- **DO NOT** interact with login forms or authentication flows
- **DO NOT** submit forms that would create real data or transactions
- **DO NOT** capture or store any PII visible on the page
 
**Git Operations — HANDS OFF:**
 
- **DO NOT** run `git commit` under any circumstances
- **DO NOT** run `git push` under any circumstances
- **DO NOT** run `git add` under any circumstances
- The user handles ALL git operations manually
 
**Philosophy:** The live page is the spec. Capture everything needed to build a pixel-perfect replica without visiting the original page again. For internal recon: capture everything so new pages use exact values from day one. Measure, don't estimate. Document, don't assume. Copy verbatim, don't recreate. If you can't extract a value programmatically, say so and suggest how to obtain it manually.
 
---
 
## See Also
 
- `/plan` — Create implementation plan from a spec (consumes this recon report)
- `/execute-plan` — Execute all steps from a generated plan
- `/verify-with-playwright` — Runtime UI verification (consumes this recon report for prod comparison)
- `/code-review` — Pre-commit code review (run after verification passes)
- `/spec` — Write a feature specification (upstream of /plan)