/**
 * Spec 6.5 — Intercessor Timeline types.
 *
 * Wire format mirrors backend `IntercessorEntry` / `IntercessorResponse` /
 * `IntercessorSummary` records.
 *
 * Gate-G-ANONYMOUS-PRIVACY (HARD): when `isAnonymous=true`, the `userId`
 * field is ABSENT from the wire JSON entirely (not present-with-null). The
 * discriminated-union type below reflects that — the `AnonymousIntercessorEntry`
 * variant has no `userId` field at all.
 */

export interface NamedIntercessorEntry {
  userId: string
  displayName: string
  isAnonymous: false
  reactedAt: string
}

export interface AnonymousIntercessorEntry {
  displayName: 'Anonymous'
  isAnonymous: true
  reactedAt: string
}

export type IntercessorEntry = NamedIntercessorEntry | AnonymousIntercessorEntry

export interface IntercessorResponse {
  entries: IntercessorEntry[]
  totalCount: number
}

export interface IntercessorSummary {
  count: number
  firstThree: IntercessorEntry[]
}
