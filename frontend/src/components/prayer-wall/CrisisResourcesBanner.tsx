import { ExternalLink, Phone } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { CRISIS_RESOURCES } from '@/constants/crisis-resources'
import { WATCH_CRISIS_BANNER_COPY } from '@/constants/watch-copy'

/**
 * Spec 6.4 — 3am Watch crisis resources banner.
 *
 * Mounts at the top of the Prayer Wall feed via PageShell when
 * useWatchMode().active === true.
 *
 * INVARIANTS (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE HARD):
 *  - Non-dismissible during the entire Watch session
 *  - No close button, no "already seen" state, no dismissal localStorage flag
 *  - role="region" with aria-labelledby — banner is ambient harm-reduction
 *    infrastructure, NOT a reactive alert (the existing daily/CrisisBanner.tsx
 *    is the keyword-triggered alert variant; see R-OVR-S4)
 *  - 988 phone link is the FIRST focusable element (W34)
 *
 * Copy: D-CrisisBannerCopy — pre-approved by Eric, NO variation without re-approval.
 * Phone + chat URLs sourced from CRISIS_RESOURCES.suicide_prevention (single
 * source of truth; mirrored in backend safety/CrisisResources.java).
 */
export function CrisisResourcesBanner() {
  const headingId = 'watch-crisis-resources-heading'
  const phoneNumber = CRISIS_RESOURCES.suicide_prevention.phone
  const chatUrl = CRISIS_RESOURCES.suicide_prevention.chat_url

  return (
    <FrostedCard
      variant="accent"
      as="section"
      role="region"
      aria-labelledby={headingId}
      className="mb-6"
    >
      <div className="space-y-3">
        <h2 id={headingId} className="text-lg font-semibold text-white">
          {WATCH_CRISIS_BANNER_COPY.heading}
        </h2>
        <p className="text-[15px] leading-[1.7] text-white">
          {WATCH_CRISIS_BANNER_COPY.body}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={`tel:${phoneNumber}`}
            aria-label={WATCH_CRISIS_BANNER_COPY.phoneLinkAriaLabel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {WATCH_CRISIS_BANNER_COPY.phoneLinkText}
          </a>
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={WATCH_CRISIS_BANNER_COPY.chatLinkAriaLabel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
          >
            {WATCH_CRISIS_BANNER_COPY.chatLinkText}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </FrostedCard>
  )
}
