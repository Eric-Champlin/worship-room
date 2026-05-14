# Verse-Finds-You Curation Worksheet (Spec 6.8)

This is a **blank** working template. It contains structure only — column
definitions, tag definitions, and the review checklist. It contains NO verse
content and NO candidate passages. Every row of the curation table is yours
to fill, applying the pastor's-wife test to each passage.

When the table is complete and reviewed, CC converts it to the `entries`
array in `backend/src/main/resources/verses/verse-finds-you.json` (pure
mechanical formatting). Then Step 7 runs.

---

## Sheet 1 — Curation Table

Fill one row per passage. Paste into a spreadsheet if easier (the header row
is tab/comma friendly).

| id | reference | text (WEB, ≤35 words) | tags | excluded_contexts | approximate_length |
|----|-----------|------------------------|------|-------------------|--------------------|
|    |           |                        |      |                   |                    |
|    |           |                        |      |                   |                    |
|    |           |                        |      |                   |                    |

_`id` = kebab-case from reference, e.g. `psalm-34-18`._
_`tags` = space- or comma-separated, from the enum on Sheet 2 only._
_`excluded_contexts` = usually empty._
_`approximate_length` = integer word count of the text._

---

## Sheet 2 — Tag Definitions (the enum — these 13 values ONLY)

Use these definitions to keep tagging consistent from entry 1 to entry 180.

| tag | meaning |
|-----|---------|
| `comfort` | God's tenderness toward the hurting. |
| `presence` | God is *with* you, not distant. The backbone tag. |
| `lament` | Honest permission to grieve; does not resolve into "but it's fine." |
| `rest` | Stillness, being carried, ceasing striving. |
| `endurance` | Strength to keep going through a long hard thing. |
| `waiting` | The ache of not-yet; trusting in the gap. |
| `uncertainty` | Not knowing what's next; God in the fog. |
| `fear` | God meeting acute anxiety or dread. |
| `loneliness` | God's nearness to the isolated, abandoned, unseen. |
| `doubt` | Honest space for "I'm not sure I believe this right now." |
| `grief` | Loss specifically (death, ending). |
| `hope` | Forward-looking expectation. Use with caution. |
| `gratitude` | Thanksgiving, praise, recognizing good. |

**Category mapping reminder (from the JSON header):** `mental-health` and
`grief` deliberately do NOT map to `hope`. Do not tag a verse `hope` if it
would sting someone in fresh grief or acute depression.

---

## Sheet 3 — The Pastor's-Wife Test (apply to EVERY entry before it goes in)

- [ ] Would this land as **grace, not judgment**, read by someone at their lowest?
- [ ] Is the text **≤35 words**?
- [ ] **No prosperity read** (not "God will give you what you want" as a promise)?
- [ ] **No guilt/shame** (no "oh ye of little faith," no mustard-seed-as-lecture)?
- [ ] **No judgment** outside an explicit lament context?
- [ ] Text verified against an actual **WEB** source?
- [ ] Do the **tags** fit the verse's real emotional register, not just its topic?
- [ ] Does it need an **`excluded_contexts`** entry (true but wrong in some context)?
- [ ] **Unsure? Cut it.** Fewer and safer beats more and dicey.

---

## Workflow

1. Curate in a spreadsheet using Sheet 1's columns.
2. Work tag-by-tag, not 1→180, to keep judgment calibrated.
3. Pull WEB text in batches from a WEB source.
4. When the sheet is done and reviewed, CC converts it to the JSON `entries` array.
5. CC runs Step 7 validation against the real file.

## Entry structure (what CC will convert each row into)

```json
{
  "id": "psalm-34-18",
  "reference": "Psalm 34:18",
  "text": "...",
  "translation": "WEB",
  "tags": ["comfort", "presence", "lament"],
  "excluded_contexts": [],
  "approximate_length": 17
}
```

All entries go inside `"entries": [ ]`, comma between objects, none after the last.
