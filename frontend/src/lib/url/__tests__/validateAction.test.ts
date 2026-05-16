import { describe, expect, it } from 'vitest'
import { validateAction, DEEP_LINKABLE_ACTIONS } from '../validateAction'

describe('validateAction', () => {
  // ---------------------------------------------------------------------------
  // Null / empty
  // ---------------------------------------------------------------------------

  it('returns null for null input', () => {
    expect(validateAction(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(validateAction('')).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Deep-linkable subset (round-trip)
  // ---------------------------------------------------------------------------

  it('accepts explain', () => {
    expect(validateAction('explain')).toBe('explain')
  })

  it('accepts reflect', () => {
    expect(validateAction('reflect')).toBe('reflect')
  })

  it('accepts cross-refs', () => {
    expect(validateAction('cross-refs')).toBe('cross-refs')
  })

  it('accepts note', () => {
    expect(validateAction('note')).toBe('note')
  })

  it('accepts highlight', () => {
    expect(validateAction('highlight')).toBe('highlight')
  })

  it('accepts share', () => {
    expect(validateAction('share')).toBe('share')
  })

  it('rejects memorize (BB-45: no longer deep-linkable — immediate toggle)', () => {
    expect(validateAction('memorize')).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Excluded actions (exist in registry but not deep-linkable)
  // ---------------------------------------------------------------------------

  it('rejects bookmark (no sub-view — toggles)', () => {
    expect(validateAction('bookmark')).toBeNull()
  })

  it('rejects pray (navigate-away action)', () => {
    expect(validateAction('pray')).toBeNull()
  })

  it('rejects journal (navigate-away action)', () => {
    expect(validateAction('journal')).toBeNull()
  })

  it('rejects meditate (navigate-away action)', () => {
    expect(validateAction('meditate')).toBeNull()
  })

  it('rejects copy (side-effect action)', () => {
    expect(validateAction('copy')).toBeNull()
  })

  it('rejects copy-with-ref (side-effect action)', () => {
    expect(validateAction('copy-with-ref')).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Unknown / malformed
  // ---------------------------------------------------------------------------

  it('rejects unknown action', () => {
    expect(validateAction('notarealaction')).toBeNull()
  })

  it('rejects case-insensitive match (URL params are case-sensitive)', () => {
    expect(validateAction('EXPLAIN')).toBeNull()
  })

  it('rejects whitespace-padded value', () => {
    expect(validateAction(' explain ')).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Constant inventory sanity check
  // ---------------------------------------------------------------------------

  // Spec 7.1 — DEEP_LINKABLE_ACTIONS grew from 6 to 7 with the addition of
  // 'pray-with-passage', whose sub-view shows the post-type picker.
  it('DEEP_LINKABLE_ACTIONS contains exactly 7 actions', () => {
    expect(DEEP_LINKABLE_ACTIONS).toHaveLength(7)
  })

  it('accepts pray-with-passage (Spec 7.1)', () => {
    expect(validateAction('pray-with-passage')).toBe('pray-with-passage')
  })

  it('every DEEP_LINKABLE_ACTIONS entry round-trips through validateAction', () => {
    for (const action of DEEP_LINKABLE_ACTIONS) {
      expect(validateAction(action)).toBe(action)
    }
  })
})
