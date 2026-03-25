import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { LocalSupportCategory } from '@/types/local-support'

interface ListingCTAsProps {
  placeName: string
  category: LocalSupportCategory
  onShareClick: () => void
}

interface CTAItem {
  label: string
  to?: string
  onClick?: () => void
}

function getCTAs(placeName: string, category: LocalSupportCategory, onShareClick: () => void): CTAItem[] {
  switch (category) {
    case 'churches':
      return [
        {
          label: 'Pray for this church',
          to: `/daily?tab=pray&context=${encodeURIComponent(`Praying for ${placeName}`)}`,
        },
        {
          label: 'Journal about your visit',
          to: `/daily?tab=journal&prompt=${encodeURIComponent(`Reflect on your experience at ${placeName}...`)}`,
        },
        {
          label: 'Share with a friend',
          onClick: onShareClick,
        },
      ]
    case 'counselors':
      return [
        {
          label: 'Pray before your appointment',
          to: `/daily?tab=pray&context=${encodeURIComponent('Preparing to meet with a counselor...')}`,
        },
        {
          label: 'Journal about your session',
          to: `/daily?tab=journal&prompt=${encodeURIComponent('After my counseling session, I feel...')}`,
        },
        {
          label: 'Share with a friend',
          onClick: onShareClick,
        },
      ]
    case 'celebrate-recovery':
      return [
        {
          label: 'Pray for your recovery journey',
          to: `/daily?tab=pray&context=${encodeURIComponent('Praying for strength in my recovery journey')}`,
        },
        {
          label: 'Journal your progress',
          to: `/daily?tab=journal&prompt=${encodeURIComponent('Reflecting on my recovery journey today...')}`,
        },
        {
          label: 'Find a meeting buddy',
          to: '/prayer-wall?template=cr-buddy',
        },
      ]
  }
}

export function ListingCTAs({ placeName, category, onShareClick }: ListingCTAsProps) {
  const ctas = getCTAs(placeName, category, onShareClick)

  return (
    <div className="border-t border-white/10 pt-3">
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-3 lg:flex lg:flex-row lg:gap-4">
        {ctas.map((cta) =>
          cta.to ? (
            <Link
              key={cta.label}
              to={cta.to}
              className="inline-flex min-h-[44px] items-center gap-1 text-sm text-primary-lt transition-colors hover:text-primary"
            >
              {cta.label}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : (
            <button
              key={cta.label}
              type="button"
              onClick={cta.onClick}
              className="inline-flex min-h-[44px] items-center gap-1 text-left text-sm text-primary-lt transition-colors hover:text-primary"
            >
              {cta.label}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ),
        )}
      </div>
    </div>
  )
}
