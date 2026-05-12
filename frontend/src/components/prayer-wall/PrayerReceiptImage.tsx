import { forwardRef } from 'react'

import type { PrayerReceiptVerse } from '@/constants/prayer-receipt-verses'
import type { PrayerReceiptResponse } from '@/types/prayer-receipt'

/**
 * Spec 6.1 — Shareable PNG share card.
 *
 * The component IS the design (D-PNG-approach / MPD-8): rendered to a hidden
 * off-screen DOM node, then captured to a PNG via html2canvas. NO canvas
 * drawing primitives. NO server round-trip — fully client-side.
 *
 * Aspect ratio: 1080×1080 (Instagram square) per Spec 6.1 D-PNG-size.
 * The 1200×630 Twitter card variant is deferred to a future spec.
 *
 * Off-screen positioning: `position: fixed; left: -99999px` so the layout
 * engine paints the node (necessary for html2canvas to read computed styles)
 * without it being visible to the user (W34).
 *
 * Fonts: Lora italic for scripture is critical (W33). The PNG-generation
 * pipeline MUST await `document.fonts.ready` before calling html2canvas;
 * otherwise the scripture falls back to system serif and the visual identity
 * breaks. The component itself relies on the same `font-serif` Tailwind
 * class as the on-page receipt — Lora must already be loaded by the time
 * any user reaches a Prayer Wall post (loaded via `<link>` in index.html).
 */
export interface PrayerReceiptImageProps {
  postExcerpt: string
  receipt: PrayerReceiptResponse
  verse: PrayerReceiptVerse
}

export const PrayerReceiptImage = forwardRef<HTMLDivElement, PrayerReceiptImageProps>(
  function PrayerReceiptImage({ postExcerpt, receipt, verse }, ref) {
    const countText =
      receipt.totalCount === 1
        ? '1 person is praying for you'
        : `${receipt.totalCount} people are praying for you`

    return (
      <div
        ref={ref}
        // Off-screen positioning for html2canvas capture (W34).
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '1080px',
          height: '1080px',
          // Inline backgroundColor so html2canvas captures a solid surface
          // regardless of body background.
          backgroundColor: '#08051A',
          color: '#fff',
          padding: '64px',
          display: 'flex',
          flexDirection: 'column',
          // Inline boxSizing because html2canvas inherits the default border-box
          // less reliably than other engines.
          boxSizing: 'border-box',
        }}
        data-testid="prayer-receipt-image"
      >
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.70)',
            fontSize: '24px',
            lineHeight: 1.5,
            marginBottom: '48px',
          }}
        >
          {postExcerpt}
        </p>

        <div style={{ marginBottom: '48px' }}>
          <p style={{ fontSize: '48px', fontWeight: 600, lineHeight: 1.2 }}>
            {countText}
          </p>
        </div>

        <blockquote
          // Lora italic — load-bearing (W33).
          className="font-serif italic"
          style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '30px',
            lineHeight: 1.5,
          }}
        >
          "{verse.text}"
          <cite
            style={{
              display: 'block',
              marginTop: '16px',
              fontSize: '22px',
              fontStyle: 'normal',
              color: 'rgba(255, 255, 255, 0.65)',
            }}
          >
            — {verse.reference} (WEB)
          </cite>
        </blockquote>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '48px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            className="font-script"
            style={{ fontSize: '28px', color: '#fff' }}
          >
            Worship Room
          </span>
        </div>
      </div>
    )
  },
)
