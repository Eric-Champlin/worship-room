# BB-26 Audio Foundation Recon

**Date:** 2026-04-14
**Purpose:** Document FCBH DBP v4 API shape, WEB audio coverage, CORS posture, rate limits, and integration points for BB-26 implementation.
**Status:** Live recon against `https://4.dbt.io/api` with a working `VITE_FCBH_API_KEY`. All endpoint shapes, coverage checks, and header verifications are from real responses.
**Method:** Direct `curl` against the DBP v4 API + HEAD requests against CloudFront signed URLs. No production code was written.

> ⚠️ **Two findings below block / reshape the BB-26 plan and must be resolved before Step 4 (DBP client) begins.** See sections 3 and 6.

---

## Executive Summary — what changed vs. the plan's assumptions

| Assumption in plan | Reality from recon | Impact |
|---|---|---|
| "WEB audio via DBP v4" (spec line 13, 200) | **No plain-narration WEB audio exists in DBP.** The only WEB audio is `type: audio_drama` (dramatized, multi-voice, with music/sfx). | **Blocking** — the spec's core product assumption is wrong. BB-26 must pick between (a) ship audio_drama under the "WEB" label, (b) switch to a translation with plain audio (KJV, ESV, NKJV all have plain `type: audio`), or (c) split: WEB plain text on screen + different translation's audio. Needs product decision before Step 4. |
| WEB fileset identifier is likely `ENGWEB` | **`ENGWEB` is the bible abbr, not the fileset id.** The actual audio filesets are `ENGWEBN2DA` (NT) and `ENGWEBN2DA-opus16` (NT, opus). There is **no OT audio under `ENGWEB` at all**. | The spec assumed a single WEB fileset identifier. The reality is: (a) `ENGWEBN2DA` — NT audio_drama (27 books, 260 chapters) from bible abbr `ENGWEB`; (b) `EN1WEBO2DA` + `EN1WEBN2DA` — full-Bible audio_drama (66 books) from bible abbr `ENGWWH` ("World English Bible - Winfred Henson"). To get OT audio, BB-26 must use ENGWWH, not ENGWEB. |
| `crossOrigin="anonymous"` required for BB-27 ducking | **Confirmed and unblocked.** FCBH CloudFront returns `access-control-allow-origin: *` **when the request includes an `Origin` header** (browser behavior). `Vary: Origin` is set. No ACAO appears without an Origin header (curl without `-H Origin: ...` sees no header, which is expected). | BB-27's Web Audio ducking path is feasible. The Step 6 `crossOrigin='anonymous'` mitigation is still required on Howler's internal element so the browser sends an Origin header on the audio request. |
| Per-chapter audio URLs may be signed/expiring (plan §10) | **Confirmed signed, expiring ~15 hours after issue.** CloudFront URL carries `Expires=<unix>`, `Signature=...`, `Key-Pair-Id=APKAI4ULLVMANLYYPTLQ`. The in-memory-only cache decision for chapter URLs is correct and load-bearing. | Do NOT persist chapter URLs to localStorage — they expire. The `bb26-v1:audioBibles` cache (metadata only) is still correct for 7 days. |
| DBP book code vocabulary matches the 66-code list in the plan | **Exact match.** All 66 codes from `GEN` through `REV` are identical to the spec. See section 7. | `book-codes.ts` lookup table (Step 10) can be written directly from the plan's list. |
| DBP license permits offline caching | **Prohibited.** License terms: "not store content for offline use unless it is explicitly marked as allowed." | BB-26 cache is fine (metadata only, not audio binary). **BB-39's PWA service worker must NOT precache audio files.** Also: Worship Room must "provide users with a link to DBP Terms and Conditions" per the license — this is a spec gap (no spec requirement mentions the attribution). Flagged in section 11. |

---

## 1. DBP v4 API Key & Auth

- **Base URL:** `https://4.dbt.io/api`
- **Auth scheme:** `key` query parameter (confirmed from OpenAPI spec at `https://4.dbt.io/openapi.json` — `securitySchemes.dbp_key = { type: 'apiKey', in: 'query', name: 'key' }`). No header-based alternative.
- **Version pin:** append `v=4` to every request. The plan's query builder in Step 4 already does this.
- **API Key registration flow:** at `https://4.dbt.io/api_key/request`. Form fields: Name, Email, "How will you use the key", **Application Name**, **Application URL**, agreement to DBP License. Keys are tied to a self-declared application URL — **not** enforced via origin whitelist in the headers we observed.
- **Public-facing safety:** The key's registration flow asks for an "Application URL" (like Google Maps JS keys) and the API returns `Access-Control-Allow-Origin: *` unconditionally — the pattern implies **the key is intended for client-side use**. The license terms also say "You must provide DBP content **directly to end users**", which further supports direct browser→DBP fetch. **Conclusion: `VITE_FCBH_API_KEY` in the frontend bundle is consistent with DBP's intended usage pattern.** It is NOT a secret. But the key is rate-limited per-key (not per-user), so a leak would let someone exhaust our rate budget — this is a mild concern, not a security hole. The BB-26 plan's env handling (via `lib/env.ts` + `require*` pattern) is correct as-is.
- **Key rotation:** no documented rotation mechanism. If the key is compromised, request a new one via the signup form.

## 2. Bibles list response (`GET /bibles`)

**Request:** `GET https://4.dbt.io/api/bibles?language_code=eng&media=audio&v=4&key=<KEY>`

- **HTTP:** 200 OK
- **Response shape:** `{ "data": [BibleEntry, ...], "meta": { "pagination": { total, per_page, current_page, last_page, next_page_url, prev_page_url, from, to } } }`
- **Pagination:** Default 50 per page; `media=audio` returned 8 results, all on one page (`total: 8`).

### The `media=audio` filter EXCLUDES audio_drama

Response with `media=audio` returns only bibles that have `type: 'audio'` filesets (plain narration):

```
ENGWEB    → NOT PRESENT      (WEB has no plain audio — only audio_drama)
ENGWWH    → NOT PRESENT      (same — only audio_drama)

AUSWBT    English - Aboriginal Translators Version
EN1ESV    English Standard Version — Hear the Word Audio Bible
ENGCSB    English - Christian Standard Bible
ENGESV    English Standard Version
ENGKJV    King James Version
ENGNKJV   New King James Version
ENGNLH    New Living Translation — her.BIBLE (women's voices)
ENGNLV    English: Liberian Standard - New Life Version
```

Only these 8 English bibles have `type: audio` (plain) filesets. **World English Bible is not among them.**

### Dropping the `media` filter reveals WEB

`GET /bibles?language_code=eng` (no media filter) returns 21 bibles total, including `ENGWEB` and `ENGWWH`. Both have `audio_drama` and `audio_drama_stream` filesets but **no `audio` (plain) filesets at all**.

### Each `BibleEntry` shape

```json
{
  "abbr": "ENGWEB",
  "name": "World English Bible",
  "vname": null,
  "language": "English",
  "autonym": "English",
  "language_id": 17045,
  "language_rolv_code": "00025",
  "iso": "eng",
  "date": null,
  "filesets": {
    "dbp-prod": [
      { "id": "ENGWEBN_ET-usx",       "type": "text_usx",          "size": "NT", ... },
      { "id": "ENGWEBN2DA-opus16",    "type": "audio_drama",       "size": "NT", "codec": "opus", "bitrate": "16kbps" },
      { "id": "ENGWEBN2SA",           "type": "audio_drama_stream","size": "NT", "codec": "mp3" },
      { "id": "ENGWEBO_ET-usx",       "type": "text_usx",          "size": "OT", ... },
      { "id": "ENGWEBO_ET-json",      "type": "text_json",         "size": "OT", ... },
      { "id": "ENGWEBN_ET",           "type": "text_plain",        "size": "NT", ... },
      { "id": "ENGWEBN_ET-json",      "type": "text_json",         "size": "NT", ... },
      { "id": "ENGWEBN2DA",           "type": "audio_drama",       "size": "NT", "codec": "mp3", "bitrate": "64kbps" },
      { "id": "ENGWEBO_ET",           "type": "text_plain",        "size": "OT", ... }
    ]
  }
}
```

Key observations:
- `filesets` is keyed by bucket ("dbp-prod"), then an array of fileset descriptors.
- Each fileset descriptor has: `id`, `type`, `size` (`C` = complete, `NT`, `OT`), optional `codec`, `bitrate`, `container`, `stock_no`, `timing_est_err`, `volume`.
- Fileset `type` values observed: `text_plain`, `text_json`, `text_usx`, `text_format`, `audio`, `audio_drama`, `audio_drama_stream`. BB-26 cares about `audio` and `audio_drama` only.
- `ENGWEB` has **no OT audio** of any kind. Only NT audio_drama.

## 3. ⚠️ WEB fileset structure — the blocking finding

### The problem

The spec assumes WEB audio is a single plain-narration fileset. It is not. DBP offers:

| Fileset ID | Bible abbr | Type | Size | Format | Coverage | Description |
|---|---|---|---|---|---|---|
| `ENGWEBN2DA` | ENGWEB | audio_drama | NT | mp3 64kbps | 27 books, 260 chapters | NT only, dramatized (multi-voice + sfx + music) |
| `ENGWEBN2DA-opus16` | ENGWEB | audio_drama | NT | opus 16kbps | 27 books, 260 chapters | Same content, compressed codec |
| `ENGWEBN2SA` | ENGWEB | audio_drama_stream | NT | mp3 | 27 books | Streaming variant (HLS?) |
| **`EN1WEBN2DA`** | **ENGWWH** | audio_drama | NT | mp3 | 27 books, 260 chapters | NT from "WEB - Winfred Henson" variant |
| **`EN1WEBO2DA`** | **ENGWWH** | audio_drama | OT | mp3 | 39 books, 929 chapters | **OT from "WEB - Winfred Henson" variant** |

**There is no `type: audio` (plain-narration) fileset for WEB anywhere in DBP.** To ship "WEB audio" BB-26 has three choices:

### Option A — Ship audio_drama under the "WEB" label

**Pros:** 66-book coverage possible (via EN1WEB*/ENGWWH), free, matches spec's "WEB only" requirement.
**Cons:** "Audio drama" is a dramatized production with voice actors, background music, sound effects. It's **very different** from the user story's language ("hear it narrated", "listen with my eyes closed"). Users expecting a single calm narrator will get a produced audiobook. This may actually be the *better* listening experience, or it may be jarring — a product call.
**Attribution concern:** The NT fileset `ENGWEBN2DA` is under the `ENGWEB` bible abbr, but the OT fileset `EN1WEBO2DA` is under a different bible abbr `ENGWWH` ("World English Bible - Winfred Henson"). Mixing them means OT and NT are technically different productions, which may have audibly different voice casts and production styles. The cleanest single-source option is **use `EN1WEB*` for both OT and NT** (same production, `ENGWWH` bible).

### Option B — Switch translation to KJV / ESV / NKJV

**Pros:** These have `type: audio` plain narration (single voice, no drama) which better matches the user story. Full coverage confirmed in the `media=audio` list.
**Cons:** Worship Room's on-screen text is WEB. Audio in a different translation would create a mismatch — users following along visually would hear different words. Also the spec explicitly says "WEB only in BB-26, translation choice is out of scope."

### Option C — Hybrid split

Screen text stays WEB; audio switches to KJV (or similar). Display a small "Audio: KJV" label in the player sheet. The scrubber and timings would be out-of-sync with the on-screen WEB verses. **Not recommended** — spec's anti-pressure and immersion principles would be violated by the mismatch.

### Recommendation

**Use `EN1WEBN2DA` (NT) + `EN1WEBO2DA` (OT) from the ENGWWH bible abbr, labeled as "World English Bible" in the player UI.** This is the cleanest WEB path with full 66-book coverage. The "audio drama" nature is acceptable IF the product is willing to treat dramatization as the feature, not a bug. This decision must be confirmed by the user before Step 4 — ping me if there's any hesitation and we'll replan around Option B or C.

If the user rejects audio_drama, the cheapest alternative is **ENGKJV** plain audio (`ENGKJVN1DA` for NT, `ENGKJVO1DA` for OT). The text-vs-audio translation mismatch would need to be addressed either by (a) switching reader text to KJV when audio starts, or (b) adding an "Audio: King James Version" label and accepting the divergence.

## 4. Chapter audio response

Two equivalent endpoints:

### A. Full fileset manifest (one request, all chapters)

**Request:** `GET /bibles/filesets/EN1WEBN2DA?v=4&key=<KEY>`
**HTTP:** 200
**Response shape:**

```json
{
  "data": [
    {
      "book_id": "1CO",
      "book_name": "1 Corinthians",
      "chapter_start": 1,
      "chapter_end": null,
      "verse_start": 1,
      "verse_start_alt": "1",
      "verse_end": null,
      "verse_end_alt": null,
      "timestamp": null,
      "path": "https://d1gd73roq7kqw6.cloudfront.net/audio/ENGWEB/ENGWEBN2DA/B07___01_1CorinthiansENGWEBN2DA.mp3?x-amz-transaction=...&Expires=1776258294&Signature=...&Key-Pair-Id=APKAI4ULLVMANLYYPTLQ",
      "duration": 237,
      "thumbnail": null,
      "filesize_in_bytes": 1927148,
      "youtube_url": null
    },
    ...  // 260 entries for NT fileset, 929 for OT fileset
  ],
  "meta": {
    "thumbnail": "https://d1gd73roq7kqw6.cloudfront.net/audio/.../Art/125x125/...jpg?... (signed)",
    "zip_file":  "https://d1gd73roq7kqw6.cloudfront.net/audio/.../EN1WEBN2DA.zip?... (signed)"
  }
}
```

The `meta.zip_file` is a bulk-download URL for the entire fileset — **do not use this**, it violates DBP license section "not store content for offline use."

### B. Per-chapter shortcut (preferred for BB-26)

**Request:** `GET /bibles/filesets/{fileset_id}/{book_id}/{chapter}?v=4&key=<KEY>`
**Example:** `GET /bibles/filesets/EN1WEBN2DA/JHN/3?v=4&key=<KEY>`
**HTTP:** 200
**Response:** `{ "data": [ {same shape as above} ] }` — wrapped in a 1-element array.

Use this endpoint in BB-26 so we're not transferring 260+ entries per chapter navigation. The plan's Step 4 `getChapterAudio(filesetId, bookCode, chapter)` maps directly to this endpoint.

### Failure modes observed

| Scenario | Response | Notes |
|---|---|---|
| Valid chapter | 200 + 1-element `data` array | Happy path |
| Missing chapter (e.g., PSA 151) | **404** + `{"error":{"message":"No Fileset Chapters Found for the provided params","status_code":404,"action":""}}` | Clean 404 — matches the plan's `http 404` error kind |
| Invalid fileset id | **404** + `{"error":{"message":"The specified fileset id `:id` could not be found.","status_code":404,"action":""}}` | Note the literal `:id` placeholder in the message — DBP bug, not a redaction. |
| **Invalid book code (e.g., XYZ)** | **200 OK** with a fallback `1CH-1` HLS playlist entry (`path: https://4.dbt.io/api/bible/filesets/EN1WEBO2DA/1CH-1--/playlist.m3u8`, `multiple_mp3: true`, `duration: 11450`) | **DBP BUG** — an unknown book code falls back to a 3-hour 1 Chronicles HLS stream instead of 404. **The BB-26 client MUST validate that the response's `book_id` matches the requested book**, or users will hear 1 Chronicles when they tap "Nehemiah 5". |

**Step 4 client hardening required:** After deserializing `getChapterAudio`, assert `response.data[0].book_id === requestedBookCode`. If not, treat as a miss (return null / hide button) — don't try to play the unrelated audio.

### Signed URL details

Every `path` is a CloudFront signed URL with query params:
- `x-amz-transaction=<number>` — tracking
- `Expires=<unix_timestamp>` — **~15 hours after issue, observed: issue at 16:56 PDT, expires at 08:04 next day**
- `Signature=<base64>` — CloudFront signature
- `Key-Pair-Id=APKAI4ULLVMANLYYPTLQ` — CloudFront key pair

The in-memory-only cache for per-chapter URLs (plan §10) is correct and required. Persisting to localStorage would serve stale URLs.

## 5. Audio file format and streaming

HEAD request on a signed `.mp3` URL:

```
HTTP/2 200
content-type: binary/octet-stream           ⚠️ not audio/mpeg
content-length: 2435376                     (~2.4 MB for John 3, 5:01 duration)
last-modified: Tue, 19 Jul 2022 17:18:34 GMT
etag: "bcda73331088411d70ce521ece169b85"
accept-ranges: bytes                        ✅ supports range requests (seeking)
x-amz-version-id: DXxNMzztA7mBQZx5BkHqVI4iZmTiW6Ic
server: AmazonS3
x-cache: Miss from cloudfront
via: 1.1 ... (CloudFront)
vary: Origin
```

**Findings:**
- **File format:** MP3 at 64 kbps. Typical NT chapter ~200-300s, ~1.6-2.5 MB. Longest observed: Psalm 119 at 1180s (19:40) / 9.5 MB.
- **Content-Type: `binary/octet-stream`** — NOT `audio/mpeg`. Browsers will sniff by file extension (`.mp3`) and play anyway; this matches how other DBP clients like YouVersion work in production. Howler's HTML5 mode should handle it via the `format: ['mp3']` override option if any browser refuses. **Flagged as a latent risk**: Step 6 should pass `format: ['mp3']` to the Howl constructor so Howler's format detection doesn't fall back to anything else if the MIME sniffing fails.
- **Range requests supported** — seeking works server-side.
- **CORS with `Origin` header:** Returns `access-control-allow-origin: *` when the request carries an `Origin: <any>` header. Without an `Origin` header (bare curl), no ACAO is sent but `vary: Origin` is present. This is exactly the behavior a browser needs — `<audio>` elements with `crossOrigin="anonymous"` send an Origin header, get `*` back, and stay untainted. **BB-27 Web Audio ducking is unblocked.**
- **Not signed by the file itself** — the signature is a CloudFront query parameter, so the same file with a different signature is the same underlying asset. URLs expire; the files are permanent.

## 6. WEB coverage sweep

Test cases (using `EN1WEBN2DA` for NT, `EN1WEBO2DA` for OT — the ENGWWH variant with full 66-book coverage):

| Reference | Fileset | HTTP | Duration | Size | Notes |
|---|---|---|---|---|---|
| Genesis 1 | EN1WEBO2DA | 200 | 470s (7:50) | 3.8 MB | ✅ |
| Genesis 50 | EN1WEBO2DA | 200 | 313s (5:13) | 2.5 MB | ✅ |
| Psalm 23 | EN1WEBO2DA | 200 | 61s (1:01) | 0.5 MB | ✅ shortest tested |
| Psalm 119 | EN1WEBO2DA | 200 | 1180s (19:40) | 9.5 MB | ✅ longest tested — flag for mobile memory if users tap this at cellular speed |
| Isaiah 53 | EN1WEBO2DA | 200 | 167s (2:47) | 1.4 MB | ✅ |
| Obadiah 1 | EN1WEBO2DA | 200 | 284s (4:44) | 2.3 MB | ✅ |
| John 3 | EN1WEBN2DA | 200 | 321s (5:21) | 2.6 MB | ✅ |
| John 21 | EN1WEBN2DA | 200 | 295s (4:55) | 2.4 MB | ✅ |
| Revelation 22 | EN1WEBN2DA | 200 | 274s (4:34) | 2.2 MB | ✅ |
| Philemon 1 | EN1WEBN2DA | 200 | 199s (3:19) | 1.6 MB | ✅ |
| 3 John 1 | EN1WEBN2DA | 200 | 140s (2:20) | 1.1 MB | ✅ |

**Coverage: 100% across all 11 spot checks.** No gaps. The AudioPlayButton will be visible on every chapter in every book when these filesets are used.

Also tested: `/bibles/filesets/EN1WEBO2DA/PSA/151` → 404 (Psalm 151 doesn't exist in the Protestant canon, as expected). The "book exists but chapter doesn't" failure mode is a clean 404.

**Only NT via `ENGWEBN2DA` (bible abbr ENGWEB):** also 100% NT coverage (27 books, 260 chapters). Usable if the product wants to ship NT-only for BB-26 and add OT in a follow-on. This would ship the NT audio under the canonical `ENGWEB` abbr rather than the `ENGWWH` variant — arguably the more "correct" WEB but with half the coverage.

## 7. Book code vocabulary

**Full DBP book code list for WEB, verified against both `EN1WEBN2DA` and `EN1WEBO2DA`:**

OT (39 books, from EN1WEBO2DA): `GEN, EXO, LEV, NUM, DEU, JOS, JDG, RUT, 1SA, 2SA, 1KI, 2KI, 1CH, 2CH, EZR, NEH, EST, JOB, PSA, PRO, ECC, SNG, ISA, JER, LAM, EZK, DAN, HOS, JOL, AMO, OBA, JON, MIC, NAM, HAB, ZEP, HAG, ZEC, MAL`

NT (27 books, from EN1WEBN2DA): `MAT, MRK, LUK, JHN, ACT, ROM, 1CO, 2CO, GAL, EPH, PHP, COL, 1TH, 2TH, 1TI, 2TI, TIT, PHM, HEB, JAS, 1PE, 2PE, 1JN, 2JN, 3JN, JUD, REV`

**Result: 100% match with the spec's list of 66 codes.** The plan's `book-codes.ts` lookup table can be written verbatim from the spec's book code list without any corrections.

**Worship Room slug → DBP code mapping** (for Step 10's `book-codes.ts`):

```ts
export const FCBH_BOOK_CODES: Record<string, string> = {
  // OT
  'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
  'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
  '1-samuel': '1SA', '2-samuel': '2SA', '1-kings': '1KI', '2-kings': '2KI',
  '1-chronicles': '1CH', '2-chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
  'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'proverbs': 'PRO',
  'ecclesiastes': 'ECC', 'song-of-solomon': 'SNG', 'isaiah': 'ISA', 'jeremiah': 'JER',
  'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN', 'hosea': 'HOS',
  'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA', 'jonah': 'JON',
  'micah': 'MIC', 'nahum': 'NAM', 'habakkuk': 'HAB', 'zephaniah': 'ZEP',
  'haggai': 'HAG', 'zechariah': 'ZEC', 'malachi': 'MAL',
  // NT
  'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN',
  'acts': 'ACT', 'romans': 'ROM', '1-corinthians': '1CO', '2-corinthians': '2CO',
  'galatians': 'GAL', 'ephesians': 'EPH', 'philippians': 'PHP', 'colossians': 'COL',
  '1-thessalonians': '1TH', '2-thessalonians': '2TH', '1-timothy': '1TI', '2-timothy': '2TI',
  'titus': 'TIT', 'philemon': 'PHM', 'hebrews': 'HEB', 'james': 'JAS',
  '1-peter': '1PE', '2-peter': '2PE', '1-john': '1JN', '2-john': '2JN',
  '3-john': '3JN', 'jude': 'JUD', 'revelation': 'REV',
}
```

**Verify against the project's canonical slugs:** cross-check against `frontend/src/constants/bible.ts` before writing. Specifically verify `song-of-solomon` (might be `song-of-songs`) and whether the reader uses `1-samuel` or `1samuel` format.

## 8. Rate limits

**Headers on every `/bibles/filesets/*` response:**

```
x-ratelimit-limit: 1500
x-ratelimit-remaining: <current remaining>
```

**No `Retry-After` header observed** (we did not hit the ceiling during recon).
**Window period NOT documented in headers.** We made ~22 API calls during recon; remaining dropped from (assumed baseline) ~1500 to 1478. Decrement is 1:1 per API call. Window is likely per-hour or per-day — I was unable to wait to see it reset.

**Implications for BB-26:**
- 1500 requests is a large budget for a single user. Per-chapter navigation at ~1 request per chapter open = 1500 chapter opens per user per window. Very forgiving.
- **The rate limit is per-KEY, not per-user.** All Worship Room users share the same quota. At scale, 1500/window across all concurrent users could be hit.
- The BB-26 cache layer (Step 5) reduces the per-user request count by serving the bibles list from a 7-day localStorage cache — most chapter navigations only incur the per-chapter call. That's the right default.
- **No backend proxy is needed at the 1500 level** as long as BB-26 stays client-side and the cache is functional. If Worship Room ever gets organic scale that exhausts the quota, the options are (a) request a higher quota from FCBH directly, (b) move calls through a backend proxy that caches responses server-side.
- **BB-26 client should NOT retry on 429.** A 429 should propagate to `audioErrorMessageFor` and render "Too many audio requests. Try again in a moment." per the plan's error map (Step 7).

**Suggested Step 17 follow-up (optional):** hit the API in a controlled burst (say, 100 calls in 10 seconds) to observe whether DBP's rate limit is per-hour or per-minute, and whether it returns `Retry-After` on 429. I did not do this to avoid poisoning the quota for actual development work.

## 9. iOS Safari Media Session notes

**Not live-tested** (desktop-only recon). Based on public documentation + known issue trackers as of 2026-04:

- `navigator.mediaSession.metadata` is **supported** on Safari 15+ on iOS 15+. Metadata appears on the lock screen and Control Center media widget when audio is playing via an `<audio>` element with a user-initiated gesture.
- `navigator.mediaSession.setActionHandler('play' | 'pause')` — **supported** on iOS Safari 15+.
- `setActionHandler('seekbackward' | 'seekforward')` — **supported** on iOS Safari 15.4+.
- `setActionHandler('seekto')` with `details.seekTime` — **supported** on iOS Safari 15.4+.
- `setActionHandler('stop')` — **supported** but iOS may ignore it in favor of its own "pause" gesture on the lock screen.
- `navigator.mediaSession.playbackState = 'playing' | 'paused' | 'none'` — **supported**, required on iOS Safari for the metadata to stay visible after pause (iOS otherwise hides the metadata when playback stops).
- **Background playback** works when the page is added to the home screen as a PWA (BB-39 already handles manifest). In the browser tab, iOS will pause audio when the tab backgrounds after a brief grace period.

**Known iOS issue relevant to BB-27 (NOT BB-26):** WebKit Bug 293891 (reported 2025-06) — `MediaElementAudioSourceNode` may produce silent output on iOS Safari 18.5 when wrapping an audio element that was loaded with `crossOrigin="anonymous"` even with correct CORS headers. This is an **iOS-only** bug, will not appear in BB-26's desktop verification, and BB-27's plan must schedule real-device iOS testing before shipping ducking. I was unable to find a published workaround as of 2026-04 — the bug is still open upstream. BB-27 planning should start from the assumption this might force a fallback ducking strategy (HTML5 element volume adjustment instead of Web Audio gain nodes).

BB-26 does NOT wrap Howler's internal element in a `MediaElementAudioSourceNode`, so this bug is not relevant to BB-26's own playback correctness — it only matters for BB-27's forward dependency.

## 10. Howler.js iOS audio context unlock

**Verified from Howler 2.2.x documentation (not yet installed — recon done via public docs):**

- Howler provides a global touch-unlock helper via `Howler.ctx` (the shared `AudioContext`). First user gesture (touch / click) triggers `Howler.ctx.resume()` automatically via Howler's internal `_unlockAudio()` routine.
- In **HTML5 mode (`html5: true`)** — which BB-26's plan specifies — Howler does NOT create an `AudioContext` for playback; it uses the underlying `<audio>` element directly. The unlock dance is simpler: iOS allows audio playback on the first user gesture, and Howler's `play()` call inside the gesture handler satisfies the requirement.
- **iOS 17+ "allow background audio" still requires a user gesture to start the first play** — BB-26's AudioPlayButton click is that gesture, so the first play() inside the click handler unlocks audio for the session.
- **Howler 2.2.4 handles iOS 15+ unlock correctly** per the library's own release notes and third-party verification.
- **Howler does NOT automatically set `crossOrigin="anonymous"` on its internal HTML5 element.** This is the gap Step 6 mitigates via the `_sounds[0]._node.crossOrigin = 'anonymous'` private-field access. Verified from Howler's source (GitHub `goldfire/howler.js/blob/2.2.4/src/howler.core.js`) — the `_loadSound` method creates the `<audio>` element without setting `crossOrigin`. Step 6's mitigation is correct and necessary.

**Recommended pin:** `howler@^2.2.4`, `@types/howler@^2.2.11` (current as of 2026-04). The `^` range will permit patch bumps but not minor bumps — minor bumps require re-verifying the `_sounds[0]._node` path.

## 11. Deferred items & open questions

### Blocking items that need user resolution before Step 4

1. **[DECISION NEEDED] Which WEB fileset path ships in BB-26?**
   - Option A: `EN1WEBN2DA` (NT) + `EN1WEBO2DA` (OT) — full 66-book audio_drama from ENGWWH variant. **Recommended.**
   - Option B: `ENGWEBN2DA` NT-only — canonical ENGWEB variant, ships NT only for BB-26, OT in a follow-on.
   - Option C: Switch translation to KJV plain audio, accept text/audio mismatch.
   - Option D: Reject audio_drama entirely, ship BB-26 with a different translation's plain audio (KJV/ESV/NKJV) and re-label the reader text column accordingly.

2. **[DECISION NEEDED] DBP license attribution link.** License terms require "provide users with a link to DBP Terms and Conditions." The spec has no mention of this. Suggested placement: a small "Audio provided by FCBH" attribution link in the expanded player sheet footer, linking to `https://www.faithcomesbyhearing.com/bible-brain/legal`. Needs product sign-off on placement.

### Known issues to carry forward to BB-26 implementation

3. **DBP bug: invalid book code returns a fallback 1CH-1 playlist.** Step 4 (DBP client) must validate `response.data[0].book_id === requestedBookCode` and treat a mismatch as a miss. Add a unit test for this defensive check.

4. **CDN Content-Type is `binary/octet-stream`, not `audio/mpeg`.** Step 6 should pass `format: ['mp3']` to the Howl constructor so Howler doesn't rely on MIME sniffing. Add to the plan's engine code.

5. **CloudFront signed URLs expire in ~15 hours.** In-memory-only per-chapter URL cache is correct. Flag: if a user opens the BibleReader, minimizes the sheet without playing, and leaves it overnight, the URL will have expired by morning. The engine's `onloaderror` will fire with a signed-URL-expired error; the plan's error mapping converts it to "Audio playback failed. Check your connection and try again." User can tap play again and the DBP client will re-fetch a fresh URL. Acceptable UX; document in a user-facing note if needed.

6. **`bitrate: '64kbps'`** — lowest quality DBP offers in mp3. Opus variants exist (`-opus16`) but Howler + some browsers (Safari < 14) don't support Opus. BB-26 uses the mp3 variant unconditionally. Flag for later: could switch to opus for modern browsers to save 75% bandwidth.

### Items not verified — open for later session

7. **Rate limit window period.** 1500 / window but window period unknown. Would require a deliberate burst-then-wait test to determine. Not blocking — BB-26 never approaches the limit in normal single-user navigation.

8. **iOS lock-screen metadata verification.** Desktop-only per spec. Deferred to mobile verification session.

9. **Real-device iOS audio context unlock.** Howler's claim is trusted from docs; not personally verified. A future mobile testing session should open the page on an iPhone, tap play, and verify audio starts within the same gesture. [UNVERIFIED — could not access iOS device]

10. **DBP rate limit per-key window length.** Likely per-hour based on standard API gateway patterns (1500/hr ≈ 25 req/min ≈ reasonable burst ceiling), but could be per-day. [UNVERIFIED — requires controlled test that would consume quota needed for real development]

11. **Public-safety posture of the FCBH key.** The pattern strongly suggests keys are intended for client-side use (ACAO:*, application-URL registration, no secret-key language in docs), but there is no explicit "this key is safe to expose in frontend JS" sentence I could find in the docs. **[UNVERIFIED — would need to email FCBH developer support for an authoritative answer]**. Treating the key as public-safe-but-rate-budgeted matches the observed behavior and the existing BB-26 plan's env handling.

12. **BB-39 PWA cache exclusion for audio files.** Flag for the BB-39 service worker — the workbox config in `vite.config.ts` must exclude `cloudfront.net/audio/*` URLs from runtime caching. License terms prohibit offline audio caching. Verify in the BB-26 execution pass when the audio URLs are first fetched in the browser, then add a globIgnore rule to `vite.config.ts` if the workbox runtime-cache picks them up.

---

## Cross-references

- **Spec:** `_specs/bb-26-fcbh-audio-bible-integration.md`
- **Plan:** `_plans/2026-04-14-bb-26-fcbh-audio-bible-integration.md` (Step 17 is this document)
- **Prior recon:** `_plans/recon/bb26-audio-competitors.md` (2026-04-10 visual/UX recon against YouVersion/Bible.is/Audible/Dwell — unaffected by this API recon's findings)
- **DBP OpenAPI spec:** `https://4.dbt.io/openapi.json` (fetched 2026-04-14, version 4.0.0-beta)
- **DBP license:** `https://www.faithcomesbyhearing.com/bible-brain/legal`
- **Howler source (reference):** `https://github.com/goldfire/howler.js/blob/2.2.4/src/howler.core.js`

## Recon artifacts (local to /tmp/bb26-recon, not committed)

The following raw files were saved during recon. They can be recreated by re-running the curls in sections 2-6. Do NOT commit them — they contain signed CloudFront URLs with valid (until expiry) auth:

- `bibles.json` — `media=audio` filter, 8 bibles
- `bibles-all-eng.json` — no filter, 21 bibles including WEB variants
- `bibles-audio-drama.json` — `media=audio_drama` filter
- `fileset-engwebn2da.json` — ENGWEB NT audio_drama manifest (260 entries)
- `fileset-en1webo2da.json` — ENGWWH OT audio_drama manifest (929 entries)
- `fileset-en1webn2da.json` — ENGWWH NT audio_drama manifest (260 entries)
- `chapter-jhn3.json` — per-chapter shortcut response for John 3
- `openapi.json` — full DBP OpenAPI spec

API key was never written to any recon artifact — the key lives only in `frontend/.env.local` and the shell's transient env var inside each `curl` command.
