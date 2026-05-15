// Spec 6.9 — wr_composer_drafts storage helpers. Plain localStorage object
// (not a reactive store — single consumer per key). Each composer owns one
// draft slot keyed by its DraftKey; the 5-second auto-save tick in
// useComposerDraft is the sole writer per key, the composer itself is the
// sole reader. Matches the verse-dismissals-storage.ts (Spec 6.8) pattern.

import type { PostType } from '@/constants/post-types'

export const COMPOSER_DRAFTS_KEY = 'wr_composer_drafts'

/** 7 days in milliseconds — drafts older than this are silently discarded on read. */
export const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Composer draft key. `PostType` values plus a synthetic `'qotd'` for the
 * separate QOTD composer (whose draft is conceptually distinct from a
 * `'discussion'` draft despite both submitting as postType: 'discussion').
 */
export type DraftKey = PostType | 'qotd'

export interface DraftRecord {
  content: string
  updatedAt: number
}

export type DraftStore = Partial<Record<DraftKey, DraftRecord>>

function readStore(): DraftStore {
  try {
    const raw = localStorage.getItem(COMPOSER_DRAFTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as DraftStore
  } catch {
    return {}
  }
}

function writeStore(store: DraftStore): void {
  try {
    localStorage.setItem(COMPOSER_DRAFTS_KEY, JSON.stringify(store))
  } catch {
    // localStorage may be unavailable (private browsing, quota); silent
    // failure is acceptable — drafts are courtesy, not contract.
  }
}

export function isDraftExpired(
  record: DraftRecord,
  now: number = Date.now(),
): boolean {
  return now - record.updatedAt > DRAFT_EXPIRY_MS
}

/**
 * Returns the draft for `key` if it exists AND is within the 7-day TTL.
 * Expired drafts are silently removed as a side effect and `null` is returned.
 */
export function getDraft(key: DraftKey): DraftRecord | null {
  const store = readStore()
  const record = store[key]
  if (!record) return null
  if (isDraftExpired(record)) {
    removeDraft(key)
    return null
  }
  return record
}

export function setDraft(key: DraftKey, content: string): void {
  const store = readStore()
  store[key] = { content, updatedAt: Date.now() }
  writeStore(store)
}

export function removeDraft(key: DraftKey): void {
  const store = readStore()
  if (!(key in store)) return
  delete store[key]
  writeStore(store)
}

export function clearAllComposerDrafts(): void {
  try {
    localStorage.removeItem(COMPOSER_DRAFTS_KEY)
  } catch {
    // Same as writeStore — silent failure is acceptable.
  }
}
