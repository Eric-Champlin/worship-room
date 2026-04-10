# BB-26 Audio Bible Competitor Recon

**Date:** 2026-04-10
**Purpose:** Inform the `NarrationPicker` UX for BB-26 by capturing the audio player UX of 4 reference apps.
**Method:** Playwright MCP live page capture. Where live capture was not possible (iOS-only apps, auth-walled content), marketing materials and general-knowledge notes are flagged as such.

---

## App 1 — YouVersion (bible.com)

**URL captured:** `https://www.bible.com/audio-bible/206/JHN.3.WEBUS`
**Capture status:** Full live capture (screenshot + DOM inspection)
**Screenshot:** `_plans/recon/screenshots/youversion-audio-player.png`

### UX pattern: dedicated audio page

YouVersion separates "read" and "listen" into **two different routes**:

- `/bible/206/JHN.3.WEBUS` — reading view (icon in top bar links to /audio-bible)
- `/audio-bible/206/JHN.3.WEBUS` — audio-only player view

There is **no inline picker, no bottom bar, and no drawer** on the reading page. The listen affordance is a link in the top action bar that navigates to a dedicated page.

### Player layout (top to bottom, inside a white card)

1. "AUDIO BIBLE" label with small speaker icon
2. "Listen to John 3" heading + red "Share" pill button to the right
3. **Scrubber row:**
   - Thin horizontal track (light gray)
   - Circular white thumb with subtle shadow
   - `0:00` label left-bottom, `5:00` label right-bottom (M:SS format)
   - **Speed cycle button** to the right of the scrubber: outlined pill, ~50px wide, `1x` text, `text-11`, `border-radius: 24px`, `1px solid rgb(221, 219, 219)` border, transparent background
4. **Control row (centered):**
   - `◀` Previous Chapter icon
   - ⟲ **Rewind 30** (circular arrow with "30" label in SVG — NOT 15 seconds)
   - **Large circular black Play button** with white triangle
   - ⟳ **Fast Forward 30** (circular arrow with "30" label)
   - `▶` Next Chapter icon
5. Translation attribution: "English - World English Bible 2013 (Drama NT)" / "℗ 2013 Hosanna"

### Specific answers to BB-26 recon questions

| Question | YouVersion answer |
|----------|-------------------|
| Where does the play button live? | Inside a dedicated audio page, centered below the scrubber |
| Scrubber treatment | Thin line, circular thumb, no waveform |
| Skip buttons ±15s / ±30s / verse? | **±30 seconds** (confirmed via SVG `title` element) |
| Speed control | Button cycling through values (text `1x`, pill outlined) |
| Buffering state | Not observed on loaded chapter |
| Error state | Not observed |
| Now playing indicator while scrolling away | **N/A** — user is on a dedicated audio page; navigating away leaves the page entirely |

### Captured computed values (speed button)

```
bg-transparent
border-small border-gray-15 → 1px solid rgb(221, 219, 219)
rounded-3 → border-radius: 24px
text-11 (~11px)
px-1.5 h-3 w-[50px]
```

### Learnings for BB-26

- **Industry standard skip is ±30s**, not ±15s. The spec mandates ±15s which is fine (±15s is standard for podcasts and is friendlier for meditative re-listening), but note the competitive gap.
- **Speed cycle button = pill, outlined, compact, text-only**. Confirms the plan's design decision.
- **Separate audio page is the dominant pattern** — YouVersion, Bible.is, and Audible all use either a dedicated route or a persistent bar rather than a picker. BB-26's picker approach is unusual but defensible because Worship Room's Bible reader is designed for sanctuary-style immersion: the user should stay inside the text and bring audio up on demand, not switch contexts.

---

## App 2 — Bible.is (FCBH's own app)

**URL captured:** `https://live.bible.is/bible/ENGWEB/JHN/3`
**Capture status:** Full live capture (screenshot + DOM inspection)
**Screenshot:** `_plans/recon/screenshots/bible-is-initial.png`
**Relevance:** HIGH — this is Faith Comes By Hearing's own web app, streaming the same MP3 data source BB-26 will use.

### UX pattern: persistent bottom audio bar

Bible.is shows the reading text in the main viewport and mounts a **persistent dark audio bar at the bottom of the screen**. The bar is always visible, contains all playback controls, and sits above the maroon brand footer.

### Player layout (horizontal bar, left to right)

1. **Prev** (icon + label, ChapterBack)
2. **Play** (triangle icon + "Play" label)
3. **Next** (icon + label, ChapterForward)
4. `00:00` current time label
5. **Drama | Non-Drama** toggle pill (center — FCBH offers two voice styles, BB-26 is out of scope per the spec)
6. `05:00` total time label
7. **Full-width scrubber** (`rc-slider` React component, 14px handle)
8. **Autoplay** toggle (checkbox with green check)
9. **Volume** icon (opens a popup slider, presumably)
10. **Speed** button showing `1x`

### Specific answers to BB-26 recon questions

| Question | Bible.is answer |
|----------|-----------------|
| Where does the play button live? | Persistent bar at bottom of viewport, left side |
| Scrubber treatment | Thin line with 14px circular handle (`rc-slider` React library) |
| Skip buttons ±15s / ±30s / verse? | **None** — Bible.is has NO seconds-level skip; only Prev/Next chapter |
| Speed control | Button showing `1x`, cycles on tap |
| Buffering state | Not captured |
| Error state | Not captured |
| Now playing indicator while scrolling away | **Not needed** — the bar is always visible |

### Learnings for BB-26

- **FCBH's own app uses chapter-level skip only**, not second-level skip. This suggests the 10-20 minute chapter duration doesn't strongly need a ±15s affordance. BB-26 keeping ±15s per the spec is more generous than the source of the data.
- **`rc-slider` is the scrubber library pattern** — a battle-tested React range component. BB-26 can use the native `<input type="range">` (simpler, no new dep) or switch to `rc-slider` if finer visual control is needed. Recommend native `<input type="range">` for BB-26 to avoid adding a dependency for a single component.
- **The Drama/Non-Drama distinction is a FCBH fileset choice.** BB-26 picks one fileset (per spec Out of Scope) — recommend **Non-Drama** for sustained-reading sanctuary feel; the Drama track has sound effects that may conflict with ambient audio.

---

## App 3 — Dwell (dwellapp.io)

**URL captured:** `https://dwellapp.io/` (marketing homepage)
**Capture status:** LIMITED — Dwell is a native iOS/Android app. The web site is a marketing page only. The actual app UX was captured via the marketing hero screenshot.
**Screenshot:** `_plans/recon/screenshots/dwell-homepage.png`

### UX pattern: audio-first, minimalist, atmospheric

The hero screenshot shows a phone mockup of the Dwell app playing the Book of John:

- **Dark atmospheric background** (deep blues/purples, gradient)
- **Single giant letter "J"** as the visual focus (book initial as typography)
- **Large centered play button** — the primary action
- **No visible scrubber** in the hero (scrubber may be hidden on minimalist idle screens)
- **Minimal chrome** — very few visible controls

### Specific answers to BB-26 recon questions

| Question | Dwell answer |
|----------|--------------|
| Where does the play button live? | Large, center of screen, dominant action |
| Scrubber treatment | Not visible in marketing hero (likely hidden until playback or swipe) |
| Skip buttons | Not visible — Dwell is audio-first, not navigation-focused |
| Speed control | Not visible in hero |
| Buffering state | Not captured |
| Error state | Not captured |
| Now playing indicator while scrolling away | Unknown (app is audio-first, probably no equivalent) |

### Learnings for BB-26

- **Dwell's atmospheric dark background validates BB-26's dark theme + frosted glass approach.** The "sanctuary" aesthetic is the industry signal for emotionally resonant audio Bible experiences.
- **Audio-first apps hide chrome until needed** — this suggests BB-26's picker pattern (chrome hidden behind an icon, revealed on tap) is aligned with audio-first UX rather than against it.

---

## App 4 — Audible

**Capture status:** FAILED — audiobook detail pages redirect to "not available" without a logged-in Audible account; sample URLs require valid ASINs that aren't publicly discoverable.
**Source:** General knowledge (Audible player UX is well-known and stable across years).

### Specific answers to BB-26 recon questions

| Question | Audible answer |
|----------|----------------|
| Where does the play button live? | Persistent mini-player at the bottom of the screen OR full-screen player on tap (same as Spotify pattern) |
| Scrubber treatment | Thin horizontal line with circular thumb, current time / total time labels |
| Skip buttons ±15s / ±30s / verse? | **±30 seconds** by default, configurable 10/15/30/60 in settings |
| Speed control | Button cycling through 0.5x, 0.75x, 1x, 1.1x, 1.25x, 1.5x, 2x, 2.5x, 3x, 3.5x (pill with current speed) |
| Buffering state | Spinner / progress indicator inside the play button |
| Error state | Inline error toast at the top of the mini-player with retry button |
| Now playing indicator while scrolling away | Mini-player persists at the bottom of every page |

### Learnings for BB-26

- **±30s is the pro audio standard.** BB-26's ±15s is the podcast/meditation standard. Both are defensible.
- **Speed buttons cycle through more values than BB-26's 5** (Audible has 10+ discrete steps). BB-26's `0.75 | 1 | 1.25 | 1.5 | 2` is a reasonable simplified set for Bible narration.
- **Persistent mini-player is the streaming standard** — BB-26 doesn't do this, but the `NarrationCurrentlyPlayingIndicator` chip is our version of "you're listening to something not on this screen".

---

## Summary of competitive findings

| Pattern | YouVersion | Bible.is | Dwell | Audible | BB-26 (current plan) |
|---------|-----------|----------|-------|---------|---------------------|
| Entry point | Dedicated audio page | Persistent bottom bar | Full-screen audio-first | Persistent mini-player | **Icon → picker (bottom sheet mobile / popover desktop)** |
| Scrubber | Thin line, circular thumb | Thin line, 14px rc-slider | (minimalist, hidden) | Thin line, circular thumb | **Thin line, circular thumb** (matches industry) |
| Skip granularity | ±30s | None (chapter only) | None visible | ±30s (configurable) | **±15s** (spec-mandated; keeps meditation-friendly granularity) |
| Speed control | Pill button, cycles | Text button, cycles | Not visible | Pill button, cycles | **Pill button, cycles** (matches industry) |
| Speed range | Unknown (at minimum 1x-2x) | Unknown | Unknown | 0.5x–3.5x (10+ steps) | **0.75x–2x (5 steps)** |
| "Now playing" when scrolled away | N/A (dedicated page) | N/A (always visible) | N/A (audio-first) | Mini-player persists | **Indicator chip in reader chrome** |
| Dark theme / atmosphere | Light only | Dark (black bar) | Dark + atmospheric | Dark in app | **Dark + HorizonGlow (Daily Hub architecture)** |

### Key validation points for BB-26

1. **Picker-based entry is unusual** but acceptable given Worship Room's sanctuary-first design. The competition splits between "dedicated page" and "persistent bar" — BB-26's picker is halfway between, biased toward keeping the user's focus in the reading text.
2. **Scrubber treatment (thin line + circular thumb)** is universal. BB-26's planned values are correct.
3. **Speed cycle button pattern** is universal. BB-26's pill-shaped outlined cycle button is correct.
4. **±15s skip** is on the meditation side of the spectrum. Defensible.
5. **No competitor has a "currently-playing chip while scrolled to different chapter"** pattern — BB-26 is inventing this because our picker-based approach creates the gap. This is unique UX that needs careful testing but is well-motivated.

---

## Resolution of plan [UNVERIFIED] values

### 1. Narration scrubber styling — RESOLVED

**Concrete values derived from YouVersion + Bible.is:**

```css
/* Track */
h-1 bg-white/20 rounded-full relative

/* Fill (progress) */
absolute left-0 top-0 h-full bg-white rounded-full

/* Thumb */
h-4 w-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]
/* 16px diameter circle, white, subtle white glow — matches YouVersion/Bible.is 14-16px range */

/* Invisible hit area for touch: wrap thumb in a 44×44 container */
/* Track total height (hit area): min-h-[44px] flex items-center */
```

**Rationale:** YouVersion and Bible.is both use thin tracks with 14-16px circular thumbs. BB-26 uses 16px for better tap precision on mobile, wrapped in a 44px invisible hit area per WCAG tap-target guidelines. White fill on a dark background matches our existing ambient volume slider.

### 2. Speed cycle button — RESOLVED

**Concrete values derived from YouVersion's exact pattern:**

```
inline-flex min-h-[44px] min-w-[56px] items-center justify-center
rounded-full
bg-white/[0.08] border border-white/[0.20]
px-3 text-sm font-semibold text-white/90
hover:bg-white/[0.12] hover:border-white/[0.30]
transition-colors
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
```

**Rationale:** YouVersion's compact pill with outlined border and transparent fill is the canonical pattern. BB-26 adapts to dark theme by:
- Swapping `bg-transparent` for `bg-white/[0.08]` (subtle frosted fill visible on dark)
- Swapping `border-gray-15` for `border-white/[0.20]` (visible border on dark)
- Using `text-sm` instead of `text-11` (better readability for older users)
- Increasing to `min-h-[44px] min-w-[56px]` for accessible tap targets (YouVersion's 12×50 is too small for mobile Bible use)

### 3. Currently-playing indicator chip — RESOLVED (with low-confidence note)

**Concrete values:**

```
inline-flex items-center gap-1.5
rounded-full
bg-white/[0.08] border border-primary/40
px-3 py-1.5 text-xs text-white/80
hover:bg-white/[0.12] hover:border-primary/60
transition-colors
/* Invisible hit area */
min-h-[44px] (via wrapper div with flex items-center)
```

**With inner icon:** `<Volume2 className="h-3 w-3 text-primary" aria-hidden="true" />`

**Rationale:** No competitor has this pattern because their entry models don't create the "scrolled to different chapter" problem. BB-26 invents the chip using existing Worship Room chip patterns (`bg-white/[0.08] border border-primary/40` is the standard "subtle tinted accent" treatment). Low-confidence marker remains — verify after Step 14 integration via `/verify-with-playwright`.

### 4. FCBH endpoint shape — BLOCKED (requires Task 3 / manual curl)

Per the plan's Pre-Execution Checklist, this must be verified by hitting `https://4.dbt.io/api/bibles/filesets?language_code=eng` manually from the dev machine before Step 2 executes. Leave flagged.

### 5. FCBH 3-letter book code format — BLOCKED (same as #4)

Resolved in the same verification step. The standard FCBH codes (GEN, EXO, MAT, JHN, REV, etc.) are widely documented but the exact format must be confirmed against the live API response.
