# Security Response Headers — Operator Runbook

This runbook is the operator-facing tuning guide for security response headers.

- **Code authority:** `backend/src/main/java/com/worshiproom/config/SecurityHeadersConfig.java`
- **Policy authority:** `.claude/rules/02-security.md` § Security Response Headers (added by spec 1.10g)
- **Test authority:** `backend/src/test/java/com/worshiproom/config/SecurityHeadersConfigTest.java`

> **Known gap.** `frontend/nginx.conf` does NOT mirror these headers. Static-asset responses served directly by nginx (without proxying to the backend) currently carry NO security headers. This is documented as deferred. A future spec can mirror the header set into nginx if static-asset coverage becomes a priority. Until then, the headers below apply only to responses produced by the Spring Boot backend (every `/api/**`, `/actuator/**`, and any unmatched path Spring renders).

---

## 1. The header set (current values)

Values live as constants in `SecurityHeadersConfig.java`. This table mirrors them and **must be updated alongside any code change**. The CSP wording is also pinned by `SecurityHeadersConfigTest.csp_directiveStringMatchesCanonical` — that test fails loudly if the constant rewords without the test catching up.

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS for 1 year on the apex + every subdomain. NO `preload` — preload is a one-way door (delisting takes weeks) and requires DNS-stable production. Re-evaluate after Phase 1 has been live for 3+ months. |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-sniffing attacks where a browser executes a non-HTML response as a script. |
| `X-Frame-Options` | `DENY` | Worship Room is never legitimately embedded. Older browsers honor only `X-Frame-Options`; modern browsers honor CSP `frame-ancestors`. Set both. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Send full URL on same-origin nav, only origin (no path/query) on cross-origin nav, nothing on HTTPS→HTTP downgrade. |
| `Content-Security-Policy` | (canonical string — see § 1.1) | Restricts load origins for scripts, styles, fonts, images, frames, and connections. `unsafe-inline` in `style-src` is deliberate (Tailwind/Vite); removal tracked as future spec 1.10g-bis. |
| `Permissions-Policy` | (canonical string — see § 1.2) | Disables device-hardware features the app doesn't use. `geolocation=(self)` allowed for Local Support; everything else denied. |

### 1.1 Canonical CSP string

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://worship-room-production.up.railway.app https://api.spotify.com; frame-src 'self' https://open.spotify.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```

CSP separates directives with `; ` (semicolon space). Per W3C CSP Level 3 spec.

### 1.2 Canonical Permissions-Policy string

```
accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
```

Permissions-Policy separates directives with `, ` (comma space) — different separator from CSP. Per W3C Permissions Policy spec. Getting one wrong silently breaks the header.

---

## 2. When to change a header

Three classes of change, each with different risk and procedure:

- **Tightening** (e.g., remove `'unsafe-inline'` from `style-src`, drop a directive, narrow an allowed host). Increases security but risks breaking the app. Always test in dev profile first; verify Lighthouse Best Practices ≥90 and DevTools Console clean of CSP-violation reports before deploy. The `unsafe-inline` removal is its own deferred spec (§ 3.3).
- **Loosening** (e.g., add a new image CDN origin, add a partner iframe ancestor, allow a new `connect-src` host). Permits new behavior the headers were blocking. Required because a new feature ships that the current CSP can't accommodate. Procedure in § 3.
- **Adding a new policy header** (e.g., `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, CSP `report-uri`). Each new header introduces a new policy surface that interacts with existing apps in non-obvious ways. **Requires its own spec** — not in scope for an operator runbook tweak.

**Never ship a "quick fix" to the constants.** Every change goes through the test → push → Railway redeploy → curl-verify cycle in § 4.

---

## 3. Loosening procedure with three worked examples

### 3.1 Adding a new image CDN origin

Scenario: Worship Room ships a Phase 8 user-avatar feature that uploads images to Cloudflare R2 at `https://avatars.worship-room.r2.dev`. The current `img-src 'self' data: https:` is already permissive (allows any HTTPS origin), so this scenario is mostly illustrative — but if the policy is later tightened to a host allowlist, the procedure looks like this:

1. Edit `SecurityHeadersConfig.CSP_VALUE` — change the `img-src` directive:
   ```java
   "img-src 'self' data: https://avatars.worship-room.r2.dev https://other-trusted.example.com",
   ```
2. Update `csp_directiveStringMatchesCanonical` in `SecurityHeadersConfigTest.java` — paste the new canonical concatenated string (the test fails until it matches).
3. Update Section 1.1 of THIS runbook with the new value.
4. Run the tests:
   ```bash
   cd backend && ./mvnw test -Dtest=SecurityHeadersConfigTest
   ```
5. Push to `forums-wave-continued`; Railway auto-redeploys (~2 min).
6. Verify the live header:
   ```bash
   curl -sI https://worship-room-production.up.railway.app/actuator/health | grep -i content-security-policy
   ```
   The output should include the new origin in the `img-src` directive.
7. Manual smoke: load the avatar feature in production with DevTools open. Watch the Console for any `Refused to load the image '<url>' because it violates the following Content Security Policy directive: ...` errors. Zero errors = pass.

### 3.2 Loosening `frame-ancestors` for a partner embed

Scenario: A partner church wants to iframe a specific Worship Room verse-share page (`https://worshiproom.com/verse/abc123`) on their site at `https://partner.example.org`.

1. Decide whether `frame-ancestors 'self' https://partner.example.org` is acceptable. Discuss with Eric — this is a security-policy decision, not just a config tweak. If yes:
2. Edit `SecurityHeadersConfig.CSP_VALUE` — change `frame-ancestors 'none'` to `frame-ancestors 'self' https://partner.example.org`.
3. **Also change `X_FRAME_OPTIONS_VALUE`** from `"DENY"` to `"SAMEORIGIN"`. Older browsers ignore CSP `frame-ancestors` and honor only `X-Frame-Options`.
   - **Trade-off note:** `SAMEORIGIN` does NOT permit cross-origin embeds. For true cross-origin embeds in legacy browsers, you'd need to REMOVE `X-Frame-Options` entirely and rely only on CSP `frame-ancestors` (modern browsers honor CSP over X-Frame-Options when both present, but legacy IE11 and older Safari versions would still block the embed). Document the trade-off in the spec that drives the change.
4. Update both test pinned values in `SecurityHeadersConfigTest.java` (the unit test header assertions and the canonical CSP string) AND Section 1 of this runbook.
5. Run tests, push, deploy:
   ```bash
   cd backend && ./mvnw test -Dtest=SecurityHeadersConfigTest
   ```
6. Verify with curl:
   ```bash
   curl -sI https://worship-room-production.up.railway.app/actuator/health | grep -iE 'frame|csp|content-security'
   ```
7. Have the partner test the embed end-to-end on their site **before** announcing. CSP errors will not show up in your DevTools — only in the embedding site's DevTools.

### 3.3 Removing `'unsafe-inline'` from `style-src` (deferred to spec 1.10g-bis)

**This is NOT a quick change.** Vite emits inline `<style>` tags whose content is unpredictable per build. Removing `'unsafe-inline'` without a proper strategy will break the entire frontend.

Two viable strategies, neither in scope for spec 1.10g:

1. **Hashed style content.** Configure Vite to emit hashed style content (deterministic per build) and add CSP `style-src` hashes (`'sha256-...'`) per build. Requires Vite plugin work + a build-time CSP-mutation step.
2. **Per-request CSP nonces.** Generate a per-request CSP nonce in a request filter, inject it into both the response `Content-Security-Policy` header and the HTML response body for inline styles to consume. Requires a request filter that can mutate the rendered HTML (currently the backend serves API only — frontend is a static SPA, so this strategy implies architectural change).

Either approach requires a coordinated frontend + backend change. The runbook entry exists so a well-meaning future operator does not "just remove `'unsafe-inline'`" and break the app — it documents WHY removing it requires its own spec.

---

## 4. Verification steps after any change

Local verification:

```bash
# 1. Tests pass
cd backend && ./mvnw test -Dtest=SecurityHeadersConfigTest

# 2. Full backend test suite still green (~422+ tests, 0 fail expected post-1.10g)
cd backend && ./mvnw test

# 3. Run the backend locally and verify all six headers
cd backend && ./mvnw spring-boot:run &
curl -sI http://localhost:8080/actuator/health | grep -iE 'security|frame|content-type|content-security|referrer|permissions|strict-transport'
# Expected: 6 lines, one per header.
```

Post-deploy verification (after Railway redeploys):

```bash
# Same six headers, against production:
curl -sI https://worship-room-production.up.railway.app/actuator/health | grep -iE 'security|frame|content-type|content-security|referrer|permissions|strict-transport'

# Browser DevTools verification:
#   1. Load https://worshiproom.com (or the Railway frontend URL).
#   2. DevTools → Network → click any request → Response Headers — verify all six.
#   3. DevTools → Console — zero CSP-violation reports (`Refused to ... because it violates the following Content Security Policy directive`).
#   4. Lighthouse → Best Practices score should be ≥90 on touched pages.
```

---

## 5. Emergency rollback

Recovery time: ~2–3 minutes. Same path as Spec 1.10 § 8.1.

**Symptoms that warrant rollback:**
- Production frontend Console shows `Refused to load script/stylesheet/font from '<url>' because it violates CSP directive '<directive>'`.
- Sentry CSP-violation report flood (if/when 1.10d wires `report-uri`).
- 5xx spike from misconfigured headers crashing on render (rare — `setHeader` doesn't throw).

**Recovery options:**

1. **Revert and redeploy** (preferred):
   ```bash
   git revert <SHA-of-1.10g>
   git push
   # Railway auto-redeploys ~2 min.
   ```

2. **Railway dashboard rollback** (faster — ~30 seconds):
   - Open Railway → backend service → Deployments → pick the deployment immediately before 1.10g → Redeploy.

3. **Hard rollback** (only if both above fail and headers are actively breaking the app):
   - Comment out the `securityHeadersFilterRegistration()` `@Bean` in `SecurityHeadersConfig.java` so the filter is no longer registered.
   - Push and redeploy.
   - This disables ALL six headers entirely while a proper fix is authored.

After any rollback, root-cause the breakage and ship a follow-up change that re-adds the headers correctly.

---

## 6. Related specs

- **Spec 1.4 (Spring Security)** — defines the JWT filter chain that the security-headers filter runs ahead of.
- **Spec 1.10 (Phase 1 Cutover)** — surfaced the CORS-bug class informing the architectural decision (filter, not declarative `http.headers()`).
- **Spec 1.10b (Deployment Target Selection)** — Railway production target, source of the `connect-src` URL.
- **Spec 1.10d (Sentry / UptimeRobot)** — owner of any future CSP `report-uri` / `report-to` work. Adding reporting endpoints belongs to that spec, not this one.
- **Spec 1.10g (this runbook's owner)** — security response headers middleware, ships the constants this runbook tunes.
- **Spec 1.10g-bis (future, deferred)** — removes `'unsafe-inline'` from `style-src` via the Vite nonce/hash strategy described in § 3.3.
