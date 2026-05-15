import { useEffect, useRef, useState } from 'react'
import {
  type DraftKey,
  type DraftRecord,
  getDraft,
  setDraft,
  removeDraft,
} from '@/services/composer-drafts-storage'

/** Auto-save tick interval in ms. Brief §2 + W1 — every 5 seconds, dirty-flag pattern. */
export const COMPOSER_DRAFT_TICK_MS = 5000

export interface UseComposerDraftOptions {
  /** Draft key — a PostType value, or 'qotd' for the QOTD composer. */
  draftKey: DraftKey
  /** Current textarea content. The hook reads this on each tick. */
  content: string
  /** Whether the composer is currently open/visible. Auto-save and restore-
   *  prompt visibility gate on this flag (NOT on React component mount —
   *  composers stay mounted across open/close cycles via aria-hidden/inert). */
  isOpen: boolean
}

export interface UseComposerDraftResult {
  /** The draft to offer for restoration. `null` when no fresh draft exists,
   *  when the user has dismissed the prompt this open session, or when the
   *  user has already restored. */
  draftToRestore: DraftRecord | null
  /** Called when the user taps "Restore draft". Returns the saved content
   *  for the caller to apply to its own state. Also dismisses the prompt. */
  restoreDraft: () => string
  /** Called when the user taps "Start fresh". Removes the draft from
   *  storage and dismisses the prompt. */
  discardDraft: () => void
  /** Called by the composer on successful submit — removes the draft from
   *  storage. Idempotent: safe to call when no draft exists. */
  clearDraft: () => void
}

/**
 * Per-composer draft hook. Auto-saves textarea content to localStorage every
 * 5 seconds while the user is actively editing (dirty-flag pattern, not
 * per-keystroke throttle).
 *
 * Lifecycle:
 *  - On `isOpen` transition false → true: re-reads the draft for `draftKey`
 *    (which may have changed since the last open). If a fresh (<7-day) draft
 *    exists, `draftToRestore` is non-null until the user resolves it.
 *  - On `draftKey` change (e.g., InlineComposer's postType prop changed):
 *    same as a reopen — re-read the draft for the new key, reset dirty flag.
 *  - On content change: marks dirty.
 *  - Every 5 seconds while `isOpen`: if dirty AND content.trim() !== '',
 *    writes content to localStorage and clears dirty. Otherwise no-op.
 *  - On unmount or `isOpen` transition true → false: clears the interval.
 *
 * @see services/composer-drafts-storage.ts for the underlying CRUD.
 */
export function useComposerDraft({
  draftKey,
  content,
  isOpen,
}: UseComposerDraftOptions): UseComposerDraftResult {
  const [draftToRestore, setDraftToRestore] = useState<DraftRecord | null>(null)
  const dirtyRef = useRef(false)
  const contentRef = useRef(content)
  const lastSavedRef = useRef<string | null>(null)

  // Keep `contentRef` in sync without depending on it in the interval effect,
  // so the interval doesn't re-create on every keystroke. Mark dirty when the
  // content changes from the last saved baseline.
  useEffect(() => {
    contentRef.current = content
    if (content !== lastSavedRef.current) {
      dirtyRef.current = true
    }
  }, [content])

  // Open / key change: re-evaluate the restore prompt + reset dirty state.
  useEffect(() => {
    if (!isOpen) {
      setDraftToRestore(null)
      return
    }
    const existing = getDraft(draftKey)
    setDraftToRestore(existing)
    dirtyRef.current = false
    lastSavedRef.current = existing?.content ?? null
  }, [isOpen, draftKey])

  // Auto-save interval — runs only while open. Reads contentRef each tick to
  // avoid re-creating the interval on every keystroke.
  useEffect(() => {
    if (!isOpen) return
    const id = window.setInterval(() => {
      if (!dirtyRef.current) return
      const current = contentRef.current
      if (current.trim() === '') return
      setDraft(draftKey, current)
      lastSavedRef.current = current
      dirtyRef.current = false
    }, COMPOSER_DRAFT_TICK_MS)
    return () => window.clearInterval(id)
  }, [isOpen, draftKey])

  const restoreDraft = (): string => {
    const restored = draftToRestore?.content ?? ''
    setDraftToRestore(null)
    // After restore, the restored content becomes the "last saved" baseline
    // so an immediate auto-save tick doesn't pointlessly re-save the same
    // content. Caller's setContent will run after restoreDraft returns.
    lastSavedRef.current = restored
    dirtyRef.current = false
    return restored
  }

  const discardDraft = (): void => {
    removeDraft(draftKey)
    setDraftToRestore(null)
    lastSavedRef.current = null
  }

  const clearDraft = (): void => {
    removeDraft(draftKey)
    setDraftToRestore(null)
    lastSavedRef.current = null
    dirtyRef.current = false
  }

  return { draftToRestore, restoreDraft, discardDraft, clearDraft }
}
