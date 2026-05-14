import { forwardRef } from 'react'

import { TRUNCATION_LINE } from '@/constants/testimony-share-copy'

/**
 * Spec 6.7 — Shareable testimony PNG design component.
 *
 * Off-screen 1080×1080 DOM node captured by html2canvas via `imageGen.ts`.
 * Same lifecycle pattern as Spec 6.1's `PrayerReceiptImage`: caller mounts
 * conditionally via React state, html2canvas reads the painted layout
 * because the node is positioned `fixed; left: -99999px` rather than
 * `display: none` (W34).
 *
 * Privacy by construction:
 *   - Initials only. No `avatarUrl` prop. The author's avatar URL is NEVER
 *     loaded into the PNG (master plan AC#2 strengthened).
 *   - Attribution comes from `authorName` + `isAnonymous` only (already
 *     resolved by the API mapper to "Anonymous" when `isAnonymous=true`).
 *     This component never reads `useAuth().user` or any other identity
 *     source — Gate-G-ANON-ATTRIBUTION.
 *   - No timestamp, no userId, no fingerprinting metadata anywhere on the
 *     card (master plan AC#3).
 */
export interface TestimonyCardImageProps {
  /** Testimony body — raw; component handles truncation at ~600 chars. */
  content: string
  /**
   * ALREADY-resolved attribution. "Anonymous" when the post is anonymous,
   * first name otherwise. Mirrors the mapper output in
   * `types/api/prayer-wall.ts`.
   */
  authorName: string
  /** Drives the avatar variant (neutral gradient + middot for anonymous). */
  isAnonymous: boolean
}

const TRUNCATION_THRESHOLD = 600

export const TestimonyCardImage = forwardRef<HTMLDivElement, TestimonyCardImageProps>(
  function TestimonyCardImage({ content, authorName, isAnonymous }, ref) {
    const needsTruncationLine = content.length > TRUNCATION_THRESHOLD
    const truncated = needsTruncationLine
      ? content.slice(0, TRUNCATION_THRESHOLD).trimEnd() + ' '
      : content

    const initial = authorName.trim().charAt(0).toUpperCase() || '·'

    return (
      <div
        ref={ref}
        aria-hidden="true"
        data-testid="testimony-card-image"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '1080px',
          height: '1080px',
          backgroundColor: '#08051A',
          color: '#fff',
          padding: '64px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '22px',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '32px',
          }}
        >
          Testimony
        </p>

        <div
          style={{
            flex: 1,
            fontSize: '30px',
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {truncated}
          {needsTruncationLine && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
              {TRUNCATION_LINE}
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          {isAnonymous ? (
            <div
              data-testid="testimony-attribution-avatar-anonymous"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '28px',
                fontWeight: 600,
              }}
            >
              ·
            </div>
          ) : (
            <div
              data-testid="testimony-attribution-avatar-named"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#6D28D9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '32px',
                fontWeight: 600,
              }}
            >
              {initial}
            </div>
          )}
          <div>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#fff' }}>
              {authorName}
            </p>
            <p
              style={{
                fontSize: '20px',
                color: 'rgba(255,255,255,0.55)',
                marginTop: '4px',
              }}
            >
              Worship Room community
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: '48px',
            paddingTop: '32px',
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span className="font-script" style={{ fontSize: '28px', color: '#fff' }}>
            Worship Room
          </span>
        </div>
      </div>
    )
  },
)
