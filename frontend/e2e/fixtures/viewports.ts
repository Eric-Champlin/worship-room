/**
 * Canonical viewport set for visual capture and a11y scans across mobile,
 * tablet, and desktop. Used by Spec 1.9, Spec 1.9b, and any future E2E spec
 * that iterates viewports for screenshots.
 *
 * Note: full-site-audit.spec.ts uses a DIFFERENT 6-viewport shape; do not
 * adopt VIEWPORTS there without an explicit spec to consolidate.
 */
export const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

export type Viewport = (typeof VIEWPORTS)[number]
