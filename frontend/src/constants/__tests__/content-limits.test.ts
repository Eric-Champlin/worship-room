import { describe, it, expect } from 'vitest'
import {
  PRAYER_POST_MAX_LENGTH,
  TESTIMONY_POST_MAX_LENGTH,
  TESTIMONY_POST_WARNING_THRESHOLD,
  TESTIMONY_POST_DANGER_THRESHOLD,
  TESTIMONY_POST_VISIBLE_AT,
  POST_TYPE_LIMITS,
} from '../content-limits'

describe('content-limits — testimony constants (Spec 4.3)', () => {
  it('TESTIMONY_POST_MAX_LENGTH is 5000', () => {
    expect(TESTIMONY_POST_MAX_LENGTH).toBe(5000)
  })

  it('TESTIMONY_POST_WARNING_THRESHOLD is below max', () => {
    expect(TESTIMONY_POST_WARNING_THRESHOLD).toBeLessThan(TESTIMONY_POST_MAX_LENGTH)
  })

  it('TESTIMONY_POST_DANGER_THRESHOLD is between warning and max', () => {
    expect(TESTIMONY_POST_DANGER_THRESHOLD).toBeGreaterThan(TESTIMONY_POST_WARNING_THRESHOLD)
    expect(TESTIMONY_POST_DANGER_THRESHOLD).toBeLessThan(TESTIMONY_POST_MAX_LENGTH)
  })

  it('testimony thresholds are ordered: visibleAt < warningAt < dangerAt < max', () => {
    expect(TESTIMONY_POST_VISIBLE_AT).toBeLessThan(TESTIMONY_POST_WARNING_THRESHOLD)
    expect(TESTIMONY_POST_WARNING_THRESHOLD).toBeLessThan(TESTIMONY_POST_DANGER_THRESHOLD)
    expect(TESTIMONY_POST_DANGER_THRESHOLD).toBeLessThan(TESTIMONY_POST_MAX_LENGTH)
  })
})

describe('content-limits — POST_TYPE_LIMITS map', () => {
  it('has an entry for every PostType', () => {
    expect(POST_TYPE_LIMITS.prayer_request).toBeDefined()
    expect(POST_TYPE_LIMITS.testimony).toBeDefined()
    expect(POST_TYPE_LIMITS.question).toBeDefined()
    expect(POST_TYPE_LIMITS.discussion).toBeDefined()
    expect(POST_TYPE_LIMITS.encouragement).toBeDefined()
  })

  it('prayer_request limits match PRAYER_POST_MAX_LENGTH (frontend asymmetry preserved per MPD-2)', () => {
    expect(POST_TYPE_LIMITS.prayer_request.max).toBe(PRAYER_POST_MAX_LENGTH)
    expect(POST_TYPE_LIMITS.prayer_request.max).toBe(1000)
  })

  it('testimony limits match TESTIMONY_POST_MAX_LENGTH', () => {
    expect(POST_TYPE_LIMITS.testimony.max).toBe(TESTIMONY_POST_MAX_LENGTH)
    expect(POST_TYPE_LIMITS.testimony.max).toBe(5000)
  })

  it('every PostType entry has all four threshold fields', () => {
    for (const postType of ['prayer_request', 'testimony', 'question', 'discussion', 'encouragement'] as const) {
      const entry = POST_TYPE_LIMITS[postType]
      expect(typeof entry.max).toBe('number')
      expect(typeof entry.warningAt).toBe('number')
      expect(typeof entry.dangerAt).toBe('number')
      expect(typeof entry.visibleAt).toBe('number')
    }
  })
})

describe('content-limits — question (Spec 4.4)', () => {
  it('question limits are 2000/1600/1900/1000 (no 5000-char expansion)', () => {
    expect(POST_TYPE_LIMITS.question.max).toBe(2000)
    expect(POST_TYPE_LIMITS.question.warningAt).toBe(1600)
    expect(POST_TYPE_LIMITS.question.dangerAt).toBe(1900)
    expect(POST_TYPE_LIMITS.question.visibleAt).toBe(1000)
  })

  it('question thresholds are ordered: visibleAt < warningAt < dangerAt < max', () => {
    const q = POST_TYPE_LIMITS.question
    expect(q.visibleAt).toBeLessThan(q.warningAt)
    expect(q.warningAt).toBeLessThan(q.dangerAt)
    expect(q.dangerAt).toBeLessThan(q.max)
  })
})

describe('content-limits — discussion (Spec 4.5)', () => {
  it('discussion limits match question (2000/1600/1900/1000) per D4', () => {
    expect(POST_TYPE_LIMITS.discussion.max).toBe(2000)
    expect(POST_TYPE_LIMITS.discussion.warningAt).toBe(1600)
    expect(POST_TYPE_LIMITS.discussion.dangerAt).toBe(1900)
    expect(POST_TYPE_LIMITS.discussion.visibleAt).toBe(1000)
  })

  it('discussion thresholds are ordered: visibleAt < warningAt < dangerAt < max', () => {
    const d = POST_TYPE_LIMITS.discussion
    expect(d.visibleAt).toBeLessThan(d.warningAt)
    expect(d.warningAt).toBeLessThan(d.dangerAt)
    expect(d.dangerAt).toBeLessThan(d.max)
  })
})

describe('content-limits — encouragement (Spec 4.6)', () => {
  it('encouragement limit is 280 (short-form)', () => {
    expect(POST_TYPE_LIMITS.encouragement.max).toBe(280)
    expect(POST_TYPE_LIMITS.encouragement.warningAt).toBe(240)
    expect(POST_TYPE_LIMITS.encouragement.dangerAt).toBe(270)
    expect(POST_TYPE_LIMITS.encouragement.visibleAt).toBe(140)
  })

  it('encouragement thresholds are ordered: visibleAt < warningAt < dangerAt < max', () => {
    const e = POST_TYPE_LIMITS.encouragement
    expect(e.visibleAt).toBeLessThan(e.warningAt)
    expect(e.warningAt).toBeLessThan(e.dangerAt)
    expect(e.dangerAt).toBeLessThan(e.max)
  })
})
