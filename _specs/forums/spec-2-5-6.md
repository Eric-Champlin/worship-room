# Forums Wave: Spec 2.5.6 — Block User Feature

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.5.6
**Branch:** `forums-wave-continued` (Eric's long-lived branch — no checkout, no new branch, no commits/pushes by CC)
**Date:** 2026-04-27

---

## Affected Frontend Routes

- `/friends` (FriendMenu — block + remove confirmations)
- `/settings` (PrivacySection — Blocked Users list + unblock confirmation)

---

# Spec 2.5.6: Block User Feature (Phase 2.5 Block UX Formalization)

**Spec ID:** `round3-phase02-5-spec06-block-user-feature`
**Branch:** `forums-wave-continued` (Eric's long-lived branch — DO NOT create a new branch, DO NOT checkout, DO NOT commit/push)
**Prereqs:** 2.5.1 ✅, 2.5.2 ✅, 2.5.3 ✅, 2.5.4 ✅, 2.5.4b ✅, 2.5.5 ✅ (cutover live; backend block + unblock endpoints have real consumers; dual-write fires by default)
**Size:** M
**Risk:** Medium (consolidates two sources of truth for blocked users, touches Settings + Friends surfaces, adds proper confirmation dialog, wires unblock dual-write)
**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` — Spec 2.5.6 body (Appendix E or main plan body — recon should grep `round3-phase02-5-spec06` for the exact location)

---

## STAY ON BRANCH

Same as the rest of Phase 2.5. Stay on `forums-wave-continued`. No `git checkout`, `git branch`, `git commit`, `git push`, `git stash`, `git reset`. Eric handles git manually.

---

## Goal

Formalize the Block User UX as a coherent feature touching three concerns:

1. **Single source of truth for blocked users** — currently split between `wr_settings.privacy.blockedUsers` and `wr_friends.blocked`. Reconcile to ONE: `wr_friends.blocked` (the friends-domain canonical store). `wr_settings.privacy.blockedUsers` becomes a legacy field; reads migrate to `useFriends.blocked`; writes go through `useFriends.blockUser` / `unblockUser`. The legacy field stays in the schema for one wave (backwards compat) but no new code reads from or writes to it.

2. **Add `unblockUser` to `useFriends`** with backend dual-write (deferred from 2.5.4 per its Divergence 4 — "no UI consumer"). Now there IS a UI consumer (the Settings → Privacy → Blocked Users list).

3. **Replace `window.confirm` block/unblock confirmations with the Modal/ConfirmDialog component** (Spec 1.9b's design system). Inline `window.confirm()` is functional but inconsistent with Phase 1's UX standards established in 1.9b. A11y: `window.confirm` is screen-reader-friendly but visually ugly and not themed.

After this spec ships:

- One block, one unblock, one storage location, one dual-write path.
- Settings page shows the same blocked list as `useFriends.blocked` (because they're the same data).
- Block confirmation matches the visual design of other destructive actions (e.g., remove friend if/when that gets a confirm dialog upgrade — separate spec).
- Backend `friend_relationships` table has the canonical block state; localStorage is shadow during Phase 2.5 wave; backend will become source-of-truth in a future wave.

---

## Master Plan Divergence

Three divergences worth flagging.

### Divergence 1: Reconcile two-source-of-truth tech debt (NOT in master plan body)

**What the master plan says:** Spec 2.5.6's body focuses on the block/unblock feature shape and acceptance criteria. It does NOT mention that `wr_settings.privacy.blockedUsers` and `wr_friends.blocked` are duplicate stores.

**What this brief says:** Recon during spec authoring discovered the duplication. Phase 2.5.6 fixes it as part of formalizing the Block UX. Without reconciliation, the dual-write surface for "block" hits both `wr_friends.blocked` (via `useFriends.blockUser`) AND `wr_settings.privacy.blockedUsers` (via `useSettings.unblockUser` reverse path). Settings page reads from settings; Friends UI reads from friends. Inconsistent state is possible today and will get worse with backend dual-write.

**Resolution:** `wr_friends.blocked` is canonical. Settings page's "Blocked Users" list reads from `useFriends.blocked` (not `useSettings`). Unblock action in Settings calls `useFriends.unblockUser` (not `useSettings.unblockUser`). The `useSettings.unblockUser` function and `wr_settings.privacy.blockedUsers` field stay defined for one more wave (avoid breaking any consumer not yet migrated) but are NOT updated by new code. Followup entry in `_plans/post-1.10-followups.md`: "Remove `wr_settings.privacy.blockedUsers` field after Phase 3 ships (no consumers will remain)."

**Why this matters now:** the cutover (Spec 2.5.5) just shipped. Backend `friend_relationships` rows now exist with `status='blocked'` for any blocks executed post-cutover. If Settings page is reading from a different localStorage key than `useFriends`, the visible list could show users who are NOT actually blocked backend-side, or hide users who ARE blocked. Reconciliation closes the loop.

### Divergence 2: Confirmation dialog replaces `window.confirm` for block + unblock (NOT in master plan body)

**What the master plan says:** Spec 2.5.6 doesn't specify confirmation UX.

**What this brief says:** Use the Modal/ConfirmDialog component pattern from Spec 1.9b for both block and unblock confirmations. `window.confirm()` calls in `FriendMenu.tsx` are replaced.

**Why:** Consistency with Spec 1.9b's design system. `window.confirm` is browser-native, can't be themed, doesn't match the cinematic dark theme aesthetic, and on mobile shows an OS-level dialog that breaks immersion. The ConfirmDialog component renders inside the app shell, supports the project's color tokens, and gives keyboard/screen-reader semantics control.

**Confirmation copy:**
- Block: title "Block {displayName}?", body "They won't be able to send you friend requests, encouragements, or nudges. Existing friendship and pending requests will be removed.", confirm button "Block", cancel button "Cancel".
- Unblock: title "Unblock {displayName}?", body "They'll be able to send you friend requests again. You won't automatically become friends.", confirm button "Unblock", cancel button "Cancel".

The unblock copy is the more interesting one — it explicitly clarifies that unblocking does NOT restore prior friendship (per backend's design from 2.5.2's `unblockUser` operation, which leaves no relationship row).

### Divergence 3: NO new "Blocked Users" section in Friends page

**What the master plan says:** Spec 2.5.6 may suggest a blocked-users surface on the Friends page itself.

**What this brief says:** Blocked users management stays in Settings → Privacy. The Friends page does not add a "Blocked Users" section.

**Why:** Two reasons. First, blocking is rare and the natural place to manage rare destructive states is Settings, not the primary feature surface. Second, adding a Blocked section to Friends page bloats a page that's already fairly dense (Search + Invite + Pending + Friend list + Suggestions). Settings has the dedicated "Privacy" section which already hosts blocked users. Stay where the existing UX places it.

**Out-of-scope check:** if a future spec wants a "Blocked Users" view inside Friends page (e.g., for fast access), it can build that. Not this spec.

---

## Backend Deliverables

NONE. Backend already supports both `blockUser` (via `POST /api/v1/users/me/blocks`) and `unblockUser` (via `DELETE /api/v1/users/me/blocks/{userId}`) per Spec 2.5.3. Block side effects (delete friendship rows, delete pending request rows) shipped in Spec 2.5.2 per its Divergence 3. Nothing changes server-side.

---

## Frontend Deliverables

### 1. `useFriends.unblockUser` (new hook method)

Add to the existing `useFriends` hook. Mirror the shape of `blockAUser`:

```typescript
const unblockAUser = useCallback(
  (userId: string) => {
    if (!isAuthenticated) return
    persist(storageUnblockUser(data, userId))

    if (shouldDualWrite()) {
      unblockUserApi(userId).catch((err) => {
        console.warn('[useFriends] backend unblockUser dual-write failed:', err)
      })
    }
  },
  [isAuthenticated, data, persist],
)
```

Returned from the hook alongside `blockUser`. Hook return type updates to include `unblockUser: (userId: string) => void`.

### 2. `friends-api.ts` adds `unblockUserApi`

```typescript
export async function unblockUserApi(userId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/users/me/blocks/${userId}`, {
    method: 'DELETE',
  })
}
```

### 3. `friends-storage.ts` adds `unblockUser` operation function

Pure operation. Removes user from `data.blocked`:

```typescript
export function unblockUser(data: FriendsData, userId: string): FriendsData {
  return {
    ...data,
    blocked: data.blocked.filter((id) => id !== userId),
  }
}
```

### 4. `ConfirmDialog` integration in `FriendMenu.tsx`

Replace `window.confirm()` with state-driven confirm dialog. Shape:

```typescript
function FriendMenu({ ... }) {
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null)

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmAction('remove')
  }

  function handleBlock(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmAction('block')
  }

  function handleConfirm() {
    if (confirmAction === 'remove') onRemove()
    else if (confirmAction === 'block') onBlock()
    setConfirmAction(null)
    onClose()
  }

  return (
    <>
      <div role="menu" ...>
        {/* existing menu items */}
      </div>
      {confirmAction === 'remove' && (
        <ConfirmDialog
          title={`Remove ${friendName} from friends?`}
          body="You can send another friend request later if you change your mind."
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'block' && (
        <ConfirmDialog
          title={`Block ${friendName}?`}
          body="They won't be able to send you friend requests, encouragements, or nudges. Existing friendship and pending requests will be removed."
          confirmLabel="Block"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  )
}
```

**Recon discovery item:** the actual `ConfirmDialog` component name and import path may differ. Spec 1.9b shipped a Modal pattern; recon should grep `frontend/src/components/` for the established confirm-dialog primitive. If no shared `ConfirmDialog` exists, this spec creates one (lightweight; ~50 lines) at `frontend/src/components/ui/ConfirmDialog.tsx`. If recon finds an existing primitive, use that.

### 5. `PrivacySection.tsx` migration to `useFriends`

Replace the dual-write to `wr_settings.privacy.blockedUsers` + `wr_friends.blocked` with a single call to `useFriends.unblockUser(userId)`. Reads come from `useFriends.blocked` (passed in as a prop to `PrivacySection`, OR `PrivacySection` calls `useFriends` directly — recon picks based on the existing prop pattern).

Replace inline `window.confirm`-equivalent flow with the same `ConfirmDialog` component used in `FriendMenu`. Confirmation copy from Divergence 2.

The `useSettings.unblockUser` callback is no longer called from `PrivacySection`. It stays defined in `useSettings` for backwards compatibility (one-wave grace period).

### 6. `Settings.tsx` minor change

Current line: `const { settings, updateProfile, updateNotifications, updatePrivacy, unblockUser } = useSettings()` — drop `unblockUser` from the destructuring (no longer passed to PrivacySection). Add `useFriends` call and pass `blocked` + `unblockUser` to `PrivacySection`.

### 7. Storage migration: legacy field becomes inert

`wr_settings.privacy.blockedUsers` continues to be serialized (don't break existing local data) but is no longer written to. New blocks fired post-2.5.6 only update `wr_friends.blocked`. Existing users who blocked someone pre-2.5.6 may have entries in BOTH stores; the merge happens lazily at read-time:

```typescript
// In Settings.tsx or PrivacySection.tsx, when computing the displayed blocked list:
const friendsBlocked = useFriends().blocked  // canonical going forward
// Legacy: settings.privacy.blockedUsers may have entries not in friendsBlocked (pre-2.5.6 data)
// Merge for display only — don't write back to settings:
const displayedBlocked = Array.from(new Set([...friendsBlocked, ...settings.privacy.blockedUsers]))
```

When user unblocks one of these "legacy" entries, `useFriends.unblockUser` removes from `wr_friends.blocked` AND `useSettings.unblockUser` removes from `wr_settings.privacy.blockedUsers` — calling both ensures legacy entries get cleaned out. After this spec ships, all new blocks land only in `wr_friends.blocked`, so over time the legacy field empties.

**Migration concern:** without this dual-call pattern, a user who blocked someone pre-2.5.6 and then unblocks them post-2.5.6 might still see them in the blocked list because `wr_settings` still has the entry. The dual-call-on-unblock pattern handles the migration without an explicit one-shot migration step.

### 8. Tests

`useFriends.unblockUser` tests in the existing `useFriends.test.tsx`:
- `unblockUser` removes user from `data.blocked`
- Flag-on + JWT → fires `DELETE /api/v1/users/me/blocks/{userId}`
- Flag-off → no API call
- Backend error swallowed; localStorage state still updates
- Simulated-auth (no JWT) → no API call

`PrivacySection` tests in `PrivacySection.test.tsx` (create if missing):
- Renders blocked list from `useFriends.blocked` prop
- Clicking Unblock opens ConfirmDialog
- ConfirmDialog confirm → calls `unblockUser` callback
- ConfirmDialog cancel → no callback
- Empty blocked list shows "You haven't blocked anyone"

`FriendMenu` tests update for ConfirmDialog (existing test may currently mock `window.confirm`):
- Block button opens ConfirmDialog with "Block" copy
- Remove button opens ConfirmDialog with "Remove" copy
- ConfirmDialog confirm fires the corresponding callback
- ConfirmDialog cancel fires nothing

`friends-storage.unblockUser` test:
- Removes user from blocked array
- No-op when user not in blocked

`friends-api.unblockUserApi` test:
- Calls `DELETE /api/v1/users/me/blocks/{userId}`
- Throws on 4xx

---

## Files to Create

```
frontend/src/components/ui/ConfirmDialog.tsx                                (IF recon finds no existing primitive — see Watch-For #1)
frontend/src/components/ui/__tests__/ConfirmDialog.test.tsx                 (same conditional)
frontend/src/components/settings/__tests__/PrivacySection.test.tsx          (IF missing — recon verifies)
```

## Files to Modify

```
frontend/src/hooks/useFriends.ts
  — add unblockAUser useCallback (mirrors blockAUser)
  — import storageUnblockUser and unblockUserApi
  — add unblockUser to hook return type and returned object

frontend/src/services/friends-storage.ts
  — add unblockUser pure operation function

frontend/src/services/api/friends-api.ts
  — add unblockUserApi function

frontend/src/components/friends/FriendMenu.tsx
  — replace window.confirm with ConfirmDialog state pattern
  — confirm copy per Divergence 2

frontend/src/components/settings/PrivacySection.tsx
  — replace direct wr_settings + wr_friends storage calls with useFriends.unblockUser
  — replace inline unblock with ConfirmDialog
  — read blocked list from useFriends.blocked (passed as prop OR called directly per recon)

frontend/src/pages/Settings.tsx
  — drop useSettings.unblockUser destructure
  — add useFriends call
  — pass blocked + unblockUser to PrivacySection (or change PrivacySection's signature to call useFriends directly)

frontend/src/hooks/__tests__/useFriends.test.tsx
  — add tests for unblockUser (5 tests per Test Plan above)

frontend/src/services/api/__tests__/friends-api.test.ts
  — add tests for unblockUserApi (3 tests)

frontend/src/services/__tests__/friends-storage.test.ts
  — add tests for unblockUser pure operation (2 tests)

frontend/src/components/friends/__tests__/FriendMenu.test.tsx
  — update existing tests for ConfirmDialog (replace window.confirm assertions)
```

## Files NOT to Modify

- `frontend/src/hooks/useSettings.ts` — `unblockUser` callback stays defined (one-wave grace period). Don't delete it.
- `frontend/src/services/settings-storage.ts` — `wr_settings.privacy.blockedUsers` field stays in the schema; don't remove.
- `frontend/src/types/settings.ts` — `UserSettingsPrivacy.blockedUsers` field stays.
- Any backend file (no backend changes per "Backend Deliverables: NONE")
- `frontend/.env.example` (no new flags; cutover already happened in 2.5.5)

## Files to Delete

None.

---

## Acceptance Criteria

### Hook + storage + API plumbing

- [ ] `useFriends.unblockUser(userId)` exists and is exported from hook
- [ ] `unblockUser` removes user from `data.blocked` via `storageUnblockUser`
- [ ] `unblockUser` fires `DELETE /api/v1/users/me/blocks/{userId}` when flag on AND JWT present
- [ ] `unblockUser` skips backend call when flag off
- [ ] `unblockUser` skips backend call when no JWT (simulated-auth mode)
- [ ] Backend error during unblock dual-write is swallowed; console.warn logged with prefix `[useFriends] backend unblockUser dual-write failed:`
- [ ] `friends-storage.unblockUser` removes user from blocked array; idempotent if user not in array
- [ ] `friends-api.unblockUserApi` makes DELETE request to correct path

### Storage source-of-truth consolidation

- [ ] New blocks fired post-2.5.6 update only `wr_friends.blocked` (NOT `wr_settings.privacy.blockedUsers`)
- [ ] Legacy `wr_settings.privacy.blockedUsers` entries (from pre-2.5.6 data) display in the blocked list via merge-at-read-time
- [ ] Unblocking a legacy entry removes it from BOTH `wr_friends.blocked` AND `wr_settings.privacy.blockedUsers` (cleanup-on-unblock pattern)
- [ ] Settings page's blocked list reads from `useFriends.blocked` (canonical) merged with `useSettings.privacy.blockedUsers` (legacy)
- [ ] No new code reads `wr_settings.privacy.blockedUsers` for any purpose other than the legacy merge

### ConfirmDialog UX

- [ ] `FriendMenu` block action opens ConfirmDialog with title "Block {displayName}?" and the body copy from Divergence 2
- [ ] `FriendMenu` remove action opens ConfirmDialog with title "Remove {displayName} from friends?"
- [ ] `PrivacySection` unblock action opens ConfirmDialog with title "Unblock {displayName}?" and the body copy clarifying that unblocking does NOT restore friendship
- [ ] ConfirmDialog confirm button uses `variant="destructive"` (red/warning styling)
- [ ] ConfirmDialog cancel button uses default neutral styling
- [ ] ConfirmDialog dismisses cleanly on Escape key
- [ ] ConfirmDialog dismisses cleanly on backdrop click
- [ ] ConfirmDialog focus management traps focus inside the dialog while open
- [ ] No `window.confirm()` calls remain in `FriendMenu.tsx` or `PrivacySection.tsx`
- [ ] No `window.confirm()` calls remain in any file modified by this spec (recon should grep to confirm)

### Backend dual-write integration (smoke)

- [ ] When user blocks someone via `FriendMenu`, backend `friend_relationships` row inserted with `status='blocked'` (verifiable via psql; depends on real backend user, mock-data UUIDs return 404 USER_NOT_FOUND which is expected and tolerated)
- [ ] When user unblocks someone via `PrivacySection`, backend `friend_relationships` row deleted (DELETE returns 204)
- [ ] Backend block side effects (per 2.5.2's Divergence 3): pending requests in either direction deleted, existing friendship rows deleted

### Test count target

M-sized → 10–20 tests per `06-testing.md`. Master plan target ~12. Distributed:
- `useFriends.unblockUser`: 5 tests
- `friends-api.unblockUserApi`: 3 tests
- `friends-storage.unblockUser`: 2 tests
- `FriendMenu` ConfirmDialog: 4 tests (replacing existing window.confirm tests)
- `PrivacySection` ConfirmDialog + useFriends migration: 4 tests
- `ConfirmDialog` (if newly created): 3 tests (rendering, confirm, cancel, escape)

Total **~21 tests**, slightly above M target due to spanning four files. Acceptable for a feature-formalization spec.

---

## What to Watch For in CC's Spec Output

1. **`ConfirmDialog` discovery.** Recon must grep `frontend/src/components/` for any existing confirm-dialog primitive (likely shipped in Spec 1.9b alongside the design system). Common names: `ConfirmDialog`, `Modal`, `Dialog`, `AlertDialog`. If found, use it. If not, create a minimal one in `frontend/src/components/ui/ConfirmDialog.tsx`. Don't pull in a heavyweight library — the project has its own design tokens.

2. **`window.confirm` removal scope.** This spec's contract is to replace `window.confirm` in `FriendMenu` and `PrivacySection`. Other places in the codebase may still use `window.confirm` (e.g., Settings → Account → "Delete Account"). Those are out of scope. Don't let CC scope-creep into a "replace all window.confirm" sweep.

3. **`useSettings.unblockUser` stays defined.** Per Divergence 1, the legacy callback stays for one wave. If CC's plan proposes removing it, push back — backwards compatibility for any consumer that might still call it (currently only PrivacySection per recon, but defense-in-depth).

4. **Storage migration is read-time merge, not a one-shot migration.** Don't let CC propose a `useEffect` that, on app boot, merges `wr_settings.privacy.blockedUsers` into `wr_friends.blocked` and clears the settings field. That would (a) silently delete user data and (b) require backend round-trips at boot for cross-device sync. The lazy read-time merge pattern is correct.

5. **Cleanup-on-unblock dual-call pattern.** The legacy field gets cleaned up only when a user actively unblocks someone. New blocks land only in `wr_friends.blocked`. Eventually the legacy field empties through use. CC's plan should describe this clearly; if the plan suggests writing to both fields on block (to "keep them in sync"), push back — that's the wrong direction; we're consolidating to one source of truth, not keeping them in sync.

6. **Settings page integration.** `Settings.tsx` currently destructures `unblockUser` from `useSettings`. After this spec, it should destructure `unblockUser` from `useFriends` (or `PrivacySection` calls `useFriends` directly). Either pattern works; recon picks based on existing prop-passing conventions in the Settings page.

7. **`ConfirmDialog` accessibility.** Required: focus trap, Escape to close, backdrop click to close, focus returns to trigger element on close, role="alertdialog" or role="dialog", aria-labelledby pointing to the title. If CC's plan shortcuts a11y, push back — Spec 1.9b's design system mandates this for any modal.

8. **Mobile gesture handling.** `ConfirmDialog` on mobile should NOT be dismissable by tapping outside the dialog (because users tap accidentally). Confirm dialogs require explicit Cancel-button tap on mobile. Desktop backdrop-click is fine. Recon should match Spec 1.9b's modal conventions.

9. **No new flag.** This spec is feature work, not infrastructure. Don't add a `VITE_USE_BLOCK_FEATURE` flag or anything similar. Block UX is on for everyone post-cutover.

10. **Don't enrich `useFriends.blocked` to include display names.** It's a `string[]` of user IDs. Display names come from `ALL_MOCK_USERS` lookup in `PrivacySection` (existing pattern). When backend reads land in a future wave, this lookup gets replaced with backend `GET /api/v1/users/{id}` calls — out of scope here.

11. **The unblock copy is intentional.** "You won't automatically become friends" is load-bearing — sets correct expectations per the backend's design (unblock leaves no relationship row; refriending requires a new friend request). Don't soften the copy.

12. **The block copy is intentional too.** "Existing friendship and pending requests will be removed" surfaces the side effects from 2.5.2's Divergence 3. Users deserve to know this will happen.

13. **Don't add an "Are you sure you want to unblock?" two-step confirmation.** One ConfirmDialog is enough. Two-step confirm patterns are for irreversible actions like account deletion. Unblock is reversible (you can re-block).

14. **Single quotes** for shell snippets, file paths, fixture strings.

---

## Out of Scope

- Replacing all `window.confirm()` calls site-wide (this spec scopes to FriendMenu + PrivacySection only)
- Removing `wr_settings.privacy.blockedUsers` field from the schema (one-wave grace period; followup tracks the eventual removal)
- One-shot migration script for legacy blocked users data (lazy read-time merge handles it)
- Adding a "Blocked Users" section to the Friends page (per Divergence 3)
- Backend changes (none needed — 2.5.2 + 2.5.3 already complete)
- `useSettings.unblockUser` removal (kept for backwards compat)
- A "Block list" admin endpoint (Phase 10 territory)
- Mute User feature (→ Spec 2.5.7, separate)
- Email notifications when blocked (no notification system in MVP)
- "X people have you blocked" social signal (privacy-preserving design says no)
- Analytics on block frequency (Phase 11+ territory)
- "Suggested unblocks" UX (e.g., "It's been 6 months — want to unblock?") — out of scope, possibly anti-pattern
- Promoting backend reads to source-of-truth for blocked users (future wave)

---

## Out-of-Band Notes for Eric

- This spec is the load-bearing UX-quality spec of Phase 2.5. It cleans up real tech debt (dual-source-of-truth) and replaces a UX wart (`window.confirm`). Worth doing well.
- Estimated execution: 1–2 sessions. Most of the work is the ConfirmDialog migration; the unblock plumbing is mechanical (mirrors block).
- The legacy field grace period assumes Phase 3 will be the natural time to remove `wr_settings.privacy.blockedUsers`. If Phase 3 doesn't touch settings storage, push the followup to Phase 4. Either way, the field's removal is a 5-line cleanup spec when ready.
- Recon discovery item #1 (ConfirmDialog primitive) is the load-bearing one. If recon finds nothing in `components/ui/`, expanding the spec to create one adds maybe 50 lines + 3 tests. If recon finds an existing primitive (likely; Spec 1.9b shipped a design system), the spec gets simpler.
- Manual smoke test recommendation post-execution: log in as a real seed user, block another seed user from FriendMenu, verify ConfirmDialog renders correctly, verify backend `friend_relationships` row inserted with `status='blocked'`. Then go to Settings → Privacy, see them in Blocked Users list, click Unblock, verify ConfirmDialog renders with "won't automatically become friends" copy, verify backend row deleted.
- Spec tracker after 2.5.6 ships: `2.5.6 ✅`, Phase 2.5 progress 7/8.
- Only Spec 2.5.7 (Mute User Feature, S-sized, Low risk) remains in Phase 2.5 after this. After 2.5.7, Phase 2.5 fully closes and CLAUDE.md gets a Phase 2.5 summary in a hygiene update.
- xHigh thinking is appropriate. The reasoning depth is moderate (storage migration semantics, cleanup-on-unblock pattern, ConfirmDialog a11y) but pattern-matchable. MAX would be over-spending.
