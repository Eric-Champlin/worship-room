/**
 * Centralized z-index scale.
 *
 * Usage in components:
 *   import { Z } from '@/constants/z-index'
 *   className={`z-[${Z.OVERLAY}]`}
 *   style={{ zIndex: Z.OVERLAY }}
 *
 * The scale is intentionally sparse to leave room for future layers.
 */
export const Z = {
  /** Celebration overlays, notification panels, floating toolbars */
  OVERLAY: 60,
  /** Tooltip callouts */
  TOOLTIP: 70,
  /** Skip-to-content links */
  SKIP_LINK: 100,
  /** PWA install banner */
  INSTALL_BANNER: 9997,
  /** PWA update prompt, scene undo toast */
  UPDATE_PROMPT: 9998,
  /** Audio pill (persistent mini-player) */
  AUDIO_PILL: 9999,
  /** Audio drawer backdrop */
  DRAWER_BACKDROP: 10000,
  /** Audio drawer content panel */
  DRAWER: 10001,
  /** Modal dialogs over drawers (routine interrupt, content switch) */
  MODAL: 10002,
} as const
