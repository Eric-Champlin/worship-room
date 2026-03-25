# Feature: Dark Theme — Bible Reader, Bible Browser & Ask Page

## Overview

The Bible Browser (`/bible`), Bible Chapter reading view (`/bible/:book/:chapter`), and AI Bible Chat (`/ask`) currently use light backgrounds (`neutral-bg` / `#F5F5F5`) that visually clash with the dashboard and landing page's fully dark theme. This spec converts all three pages to the unified dark theme, creating a seamless experience when navigating between pages. The dark background creates a more immersive, contemplative atmosphere appropriate for reading Scripture and seeking biblical guidance.

This is the **second of 6 visual foundation specs**. It builds on the dark theme pattern established in Spec 1 (Daily Hub Dark Theme) and applies the same conventions: `#0f0a1e` page background, frosted glass cards at `bg-white/[0.08]`, flush dark gradients, and white/opacity text hierarchy.

## User Story

As a **logged-out visitor or logged-in user**, I want the Bible Browser, Bible chapter reading view, and Ask page to share the same dark theme as the dashboard and landing page, so that navigating between pages feels like one unified, immersive experience rather than jumping between two different visual styles.

## Requirements

### 1. Bible Browser (`/bible`)

#### 1.1 Page Background
- Replace `neutral-bg` (#F5F5F5) page background with solid dark (`#0f0a1e`) edge-to-edge from navbar to footer
- No white or light gray sections anywhere on the page

#### 1.2 Hero Section
- The hero currently renders as a floating purple gradient box on a light background — remove the floating box appearance
- Make the gradient flush with the page background (no visible edges, borders, or box-shadow on the hero container)
- The gradient should blend seamlessly into the dark page background below (no color jump or visible line)
- Hero text (book title, subtitle) stays white — only the background changes

#### 1.3 Books/Search Segmented Control
- Becomes frosted glass: `bg-white/[0.08] border border-white/10 rounded-full`
- Active segment indicator stays primary-colored
- Inactive segment text: `text-white/60`
- Active segment text: `text-white`

#### 1.4 Book Accordion (Old Testament / New Testament)
- The accordion sections currently have a dark card style but sit on a light background — the dark background now matches, making the accordion feel integrated rather than floating
- Verify that the accordion cards have sufficient border/contrast to remain distinguishable from the background
- Section headers (e.g., "Old Testament", "New Testament"): `text-white`
- Book names within accordion: `text-white/80`
- Chapter number links: `text-white/60` with hover state `text-white`

#### 1.5 Search View
- Search input: `bg-white/[0.06]` with cyan glow-pulse border on focus, `text-white` for input text, `placeholder text-white/40`
- Search results cards: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Verse text within results: `text-white`
- Reference text within results: `text-white/50`
- "Searching X of 66 books" progress text: `text-white/40`

### 2. Bible Chapter Reading View (`/bible/:book/:chapter`)

#### 2.1 Page Background
- Replace page background with solid dark (`#0f0a1e`) edge-to-edge

#### 2.2 Hero Section
- Chapter hero becomes flush dark gradient (no floating box, no visible edges)
- Blends seamlessly into the dark page background below
- Chapter title and book name stay white

#### 2.3 Verse Reading Area
- Verse text: Lora font, 18px/1.8 line-height, `text-white/80` for comfortable dark-background reading
- Verse numbers: `text-white/30` superscript
- Verse highlight colors (yellow, green, blue, pink): increase opacity from 15% to 20% so highlights are visible against the dark background
- Selected verse state: verify the selection indicator is visible on dark

#### 2.4 Floating Action Bar (verse tap)
- Stays frosted glass (already `bg-white/15 backdrop-blur-md`) — verify it looks correct on the dark background
- Button icons and text should be white/high-contrast

#### 2.5 Note Editor
- Textarea: `bg-white/[0.06]` with `text-white`
- Placeholder: `text-white/40`
- Save/cancel buttons: match the frosted glass button pattern

#### 2.6 Audio Control Bar
- Becomes frosted glass: `bg-white/[0.06] backdrop-blur-sm border border-white/10`
- Verify it looks correct as a sticky element over dark content (no transparency issues when scrolling verse text beneath it)
- Play/pause icons and progress indicators: white/high-contrast
- Speed selector pills: `bg-white/10` unselected, `bg-primary/20` selected
- Speed selector text: `text-white/70` unselected, `text-white` selected

#### 2.7 Chapter Navigation
- Previous/Next chapter buttons: `bg-white/10 text-white/70 hover:bg-white/15`
- Arrow icons: same color as text

#### 2.8 My Highlights & Notes Section
- Cards become frosted glass on dark background: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Highlight color dots remain their respective colors (yellow, green, blue, pink)
- Note text: `text-white/80`
- Reference text: `text-white/50`
- Timestamp text: `text-white/40`

### 3. Ask Page (`/ask`)

#### 3.1 Page Background
- Replace page background with solid dark (`#0f0a1e`) edge-to-edge

#### 3.2 Hero Section
- Hero becomes flush dark gradient (no floating box)
- Blends seamlessly into the dark page background below
- Hero title and subtitle text stays white

#### 3.3 Question Input Area
- Textarea: `bg-white/[0.06]` with cyan glow-pulse border on focus, `text-white` input text, `placeholder text-white/40`
- Quick-start topic chips: `bg-white/10 border-white/15 text-white/70 hover:bg-white/15`
- "Find Answers" button: stays primary purple (already works on dark) — no change needed

#### 3.4 Loading State
- Loading message text: `text-white/60`
- Loading spinner/animation: verify visibility on dark background

#### 3.5 AI Response Section
- Direct answer text: `text-white/80`
- Supporting verse cards: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Verse reference text: `text-white font-bold`
- Verse text: Lora italic, `text-white/70`
- Explanation text: `text-white/50`
- Closing encouragement callout: `bg-white/[0.06] border-l-2 border-primary`
- Prayer text: Lora italic, `text-white/60`

#### 3.6 Follow-Up Questions
- Follow-up question chips: `bg-white/10 text-white/70 hover:bg-white/15`

#### 3.7 Feedback & Actions
- "Was this helpful?" thumbs up/down buttons: `bg-white/10 hover:bg-white/15`
- Thumb icons: `text-white/60`

#### 3.8 Conversation Thread
- User question bubbles: `bg-primary/20 text-white`
- AI response sections: same styling as described in 3.5 above

#### 3.9 Recent Questions
- Recent Questions cards: `bg-white/[0.06] border border-white/10 rounded-xl`
- Question text: `text-white/80`
- Timestamp/metadata: `text-white/40`
- "Save this conversation" button: `bg-white/10 text-white/70 hover:bg-white/15`

### 4. Cross-Page Consistency

- Verify the SiteFooter has no visible seam where dark content meets the dark footer on all three pages
- Verify the navbar frosted glass looks correct over the dark page backgrounds (no double-layering or opacity issues)
- All frosted glass cards use `bg-white/[0.08]` for slightly more solid appearance (per project decision on glass opacity) — note: content cards and inputs use `bg-white/[0.06]`, structural elements like segmented controls use `bg-white/[0.08]`
- All text meets WCAG AA contrast on dark backgrounds

## Acceptance Criteria

### Bible Browser (`/bible`)
- [ ] Page background is solid dark (#0f0a1e) from navbar to footer with no light gray or white sections
- [ ] Hero gradient is flush with the page background — no visible box edges, borders, or floating appearance
- [ ] Hero blends seamlessly into the dark page background below (no color jump or visible line)
- [ ] Books/Search segmented control uses frosted glass: `bg-white/[0.08] border border-white/10 rounded-full`
- [ ] Active segment text is `text-white`, inactive is `text-white/60`
- [ ] Book accordion sections are visually integrated with the dark background (not floating on light)
- [ ] Section headers are `text-white`, book names are `text-white/80`
- [ ] Search input has `bg-white/[0.06]` with cyan glow-pulse border on focus
- [ ] Search input text is white, placeholder is `text-white/40`
- [ ] Search results cards use `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- [ ] Verse text in results is `text-white`, references are `text-white/50`
- [ ] "Searching X of 66 books" text is `text-white/40`

### Bible Chapter Reading View (`/bible/:book/:chapter`)
- [ ] Page background is solid dark (#0f0a1e) from navbar to footer
- [ ] Chapter hero is flush dark gradient with no floating box appearance
- [ ] Verse text uses Lora font at 18px/1.8 in `text-white/80`
- [ ] Verse numbers are `text-white/30` superscript
- [ ] Verse highlight colors (yellow, green, blue, pink) use 20% opacity and are visible against the dark background
- [ ] Floating action bar (verse tap) renders correctly on dark — frosted glass with white icons/text
- [ ] Note editor textarea has `bg-white/[0.06]` with `text-white`
- [ ] Audio control bar uses frosted glass (`bg-white/[0.06] backdrop-blur-sm border border-white/10`) and looks correct as sticky element over scrolling dark content
- [ ] Speed selector pills: `bg-white/10` unselected, `bg-primary/20` selected
- [ ] Chapter navigation buttons are `bg-white/10 text-white/70 hover:bg-white/15`
- [ ] My Highlights & Notes cards use frosted glass (`bg-white/[0.06] border border-white/10`)
- [ ] Highlight color dots remain their original colors (yellow, green, blue, pink)

### Ask Page (`/ask`)
- [ ] Page background is solid dark (#0f0a1e) from navbar to footer
- [ ] Hero is flush dark gradient with no floating box appearance
- [ ] Textarea has `bg-white/[0.06]` with cyan glow-pulse border, white input text, `text-white/40` placeholder
- [ ] Quick-start topic chips are `bg-white/10 border-white/15 text-white/70 hover:bg-white/15`
- [ ] "Find Answers" button stays primary purple
- [ ] Loading state message is `text-white/60`
- [ ] Direct answer text is `text-white/80`
- [ ] Supporting verse cards use `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- [ ] Verse reference text is `text-white font-bold`, verse text is Lora italic `text-white/70`, explanation is `text-white/50`
- [ ] Closing encouragement callout uses `bg-white/[0.06] border-l-2 border-primary`
- [ ] Prayer text is Lora italic `text-white/60`
- [ ] Follow-up chips are `bg-white/10 text-white/70 hover:bg-white/15`
- [ ] Thumbs up/down buttons are `bg-white/10 hover:bg-white/15`
- [ ] User question bubbles are `bg-primary/20 text-white`
- [ ] Recent Questions cards use `bg-white/[0.06] border border-white/10`
- [ ] "Save this conversation" button is `bg-white/10 text-white/70`

### Cross-Page Consistency
- [ ] SiteFooter has no visible seam where dark content meets the dark footer on all three pages
- [ ] Navbar frosted glass looks correct over the dark page backgrounds
- [ ] All frosted glass structural elements use `bg-white/[0.08]`
- [ ] All frosted glass content cards use `bg-white/[0.06]`

### Responsive
- [ ] Dark theme renders correctly at mobile (375px) on all three pages — no light edges, gaps, or overflow
- [ ] Dark theme renders correctly at tablet (768px) on all three pages
- [ ] Dark theme renders correctly at desktop (1440px) on all three pages
- [ ] Dark background extends full-width with no light edges or gaps at any breakpoint
- [ ] All frosted glass cards are distinguishable from the background (border-white/10 provides edge definition)

### Accessibility
- [ ] Text contrast meets WCAG AA on the dark background (white/80 on #0f0a1e is approximately 11:1 ratio)
- [ ] Verse highlight colors at 20% opacity still provide sufficient contrast for highlighted text
- [ ] All interactive elements remain keyboard-navigable
- [ ] Focus indicators are visible on the dark background
- [ ] Screen readers are unaffected (no changes to ARIA attributes or semantic structure)

### General
- [ ] No changes to functionality, layout, spacing, or interactive behavior — purely visual
- [ ] All existing tests pass (update test assertions for class name changes if needed)

## UX & Design Notes

- **Tone**: The dark theme creates a more immersive, contemplative atmosphere appropriate for Bible reading and seeking spiritual guidance through AI chat
- **Colors**: Follows the pattern established in Spec 1 (Daily Hub Dark Theme) — `#0f0a1e` page background, `bg-white/[0.06]` content cards, `bg-white/[0.08]` structural elements, white/opacity text hierarchy
- **Typography**: No font changes — only color changes. Lora stays for verse text, Inter for UI elements. The verse reading area specifically uses Lora 18px/1.8 for optimal dark-background readability.
- **Design system recon reference**: The current Inner Page Hero gradient and card patterns are documented in `_plans/recon/design-system.md` under "Background Gradients" (Inner Page Hero) and "Card Pattern" sections. The new dark values replace these for these pages only.
- **Highlight opacity adjustment**: Verse highlights change from 15% to 20% opacity — this is a dark-background-specific adjustment. The highlight colors themselves (yellow, green, blue, pink) remain unchanged; only their background opacity increases to maintain visibility.
- **New visual patterns**: None. All patterns (frosted glass cards, flush dark gradients, white/opacity text hierarchy, cyan glow inputs) are established in Spec 1 (Daily Hub) and the existing dashboard. No new patterns are introduced.
- **Animations**: All existing animations (cyan glow-pulse on textareas, Bible audio playback progress, verse tap action bar appearance) remain unchanged. Only their background context changes.

### Responsive Behavior

- **Mobile (< 640px)**: Dark background extends full-width. Bible Browser accordion stacks vertically. Chapter reading view uses full-width verse text. Ask page textarea and response cards are full-width. All text colors use the same dark theme values. Touch targets remain 44px minimum.
- **Tablet (640px - 1024px)**: Same dark theme. Bible Browser may show book grid in 2-3 columns. Chapter reading view maintains comfortable reading width. Ask page content centered.
- **Desktop (> 1024px)**: Same dark theme. Content centered within existing max-width constraints. Frosted glass effects render with full backdrop-blur support. Bible Browser may show book grid in multi-column layout.

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the Ask page (`/ask`) has a text input where users can type questions. The existing crisis detection should remain active and unchanged. The crisis banner must remain clearly visible on the dark background.
- **User input involved?**: Yes — Ask page textarea for questions. No changes to input handling, validation, or crisis keyword detection.
- **AI-generated content?**: Yes — AI Bible chat responses display in the response section. No changes to content rendering. Plain text only, no HTML/Markdown rendering (unchanged).

## Auth & Persistence

- **No changes to auth gating** — all existing auth gates remain exactly as they are
- **No changes to persistence** — all localStorage keys and data flows remain unchanged
- **Route types**: Public (`/bible`, `/bible/:book/:chapter`, `/ask`)
- This spec is purely visual — it changes CSS classes, not component structure or data flow

### Auth Behavior Summary (unchanged, for reference)

- **Logged-out users CAN**: Browse the Bible Browser, read any chapter, search the Bible, use highlights/notes (stored in localStorage), listen to Bible audio, type questions in Ask, view AI responses, use follow-up chips, give thumbs feedback
- **Logged-out users CANNOT**: No auth-gated actions on these three pages currently exist (all are public routes with localStorage-based persistence)

## Out of Scope

- **Dark theme for other pages** — this spec covers only `/bible`, `/bible/:book/:chapter`, and `/ask`. Other pages (Music, Prayer Wall, Reading Plans, Local Support, etc.) will be converted in subsequent specs (3-6 of the visual foundation series)
- **Meditation sub-pages** — separate routes with their own visual treatment, addressed in a future spec
- **Dark mode toggle** — this is a permanent dark theme conversion, not a user-togglable dark mode
- **New component creation** — this spec reuses existing components with updated Tailwind classes
- **Backend changes** — no API or backend changes
- **New animations or interactions** — all existing animations stay; no new ones are added
- **Navbar or footer changes** — the navbar is already glassmorphic and the footer is already dark; this spec only ensures no visual seams where they meet the newly-darkened content area
- **Tailwind config changes** — the required color tokens (#0f0a1e, etc.) should be achievable with Tailwind arbitrary values. If a new config token is truly needed, that's an implementation decision for `/plan`
- **Bible content or translation changes** — WEB translation content remains unchanged
- **AI chat logic or response quality** — no changes to how AI responses are generated or displayed beyond color
