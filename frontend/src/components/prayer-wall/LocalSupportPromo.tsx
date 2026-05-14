import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'

/**
 * Prayer Wall Redesign (2026-05-13) — Local Support promo for the right
 * sidebar. Calm, no urgency, no metrics. Routes to the Churches locator
 * as the entry point to the three Local Support surfaces.
 */
export function LocalSupportPromo() {
  return (
    <FrostedCard variant="default" as="section" aria-labelledby="lsp-heading">
      <h3 id="lsp-heading" className="text-sm font-semibold text-white">
        Need someone to talk to?
      </h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">
        Find a local church, counselor, or Celebrate Recovery group near you.
      </p>
      <Link
        to="/local-support/churches"
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.07] border border-white/[0.12] backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.12] hover:border-white/[0.20] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        Browse Local Support
      </Link>
    </FrostedCard>
  )
}
