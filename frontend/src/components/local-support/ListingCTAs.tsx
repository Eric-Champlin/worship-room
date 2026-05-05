import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Heart, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
  icon: LucideIcon
  iconColor: string
}

function getCTAs(placeName: string, category: LocalSupportCategory, onShareClick: () => void): CTAItem[] {
  switch (category) {
    case 'churches':
      return [
        {
          label: 'Pray for this church',
          to: `/daily?tab=pray&context=${encodeURIComponent(`Praying for ${placeName}`)}`,
          icon: Heart,
          iconColor: 'text-pink-300',
        },
        {
          label: 'Journal about your visit',
          to: `/daily?tab=journal&prompt=${encodeURIComponent(`Reflect on your experience at ${placeName}...`)}`,
          icon: BookOpen,
          iconColor: 'text-sky-300',
        },
        {
          label: 'Share with a friend',
          onClick: onShareClick,
          icon: MessageSquare,
          iconColor: 'text-violet-300',
        },
      ]
    case 'counselors':
      return [
        {
          label: 'Pray before your appointment',
          to: `/daily?tab=pray&context=${encodeURIComponent('Preparing to meet with a counselor...')}`,
          icon: Heart,
          iconColor: 'text-pink-300',
        },
        {
          label: 'Journal about your session',
          to: `/daily?tab=journal&prompt=${encodeURIComponent('After my counseling session, I feel...')}`,
          icon: BookOpen,
          iconColor: 'text-sky-300',
        },
        {
          label: 'Share with a friend',
          onClick: onShareClick,
          icon: MessageSquare,
          iconColor: 'text-violet-300',
        },
      ]
    case 'celebrate-recovery':
      return [
        {
          label: 'Pray for your recovery journey',
          to: `/daily?tab=pray&context=${encodeURIComponent('Praying for strength in my recovery journey')}`,
          icon: Heart,
          iconColor: 'text-pink-300',
        },
        {
          label: 'Journal your progress',
          to: `/daily?tab=journal&prompt=${encodeURIComponent('Reflecting on my recovery journey today...')}`,
          icon: BookOpen,
          iconColor: 'text-sky-300',
        },
        {
          label: 'Find a meeting buddy',
          to: '/prayer-wall?template=cr-buddy',
          icon: MessageSquare,
          iconColor: 'text-violet-300',
        },
      ]
  }
}

export function ListingCTAs({ placeName, category, onShareClick }: ListingCTAsProps) {
  const ctas = getCTAs(placeName, category, onShareClick)

  return (
    <div className="border-t border-white/10 pt-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {ctas.map((cta) => {
          const Icon = cta.icon
          const content = (
            <>
              <Icon size={14} className={cta.iconColor} aria-hidden="true" />
              <span className="flex-1 truncate">{cta.label}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )
          return cta.to ? (
            <Link
              key={cta.label}
              to={cta.to}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white transition-colors hover:text-white/80"
            >
              {content}
            </Link>
          ) : (
            <button
              key={cta.label}
              type="button"
              onClick={cta.onClick}
              className="inline-flex min-h-[44px] items-center gap-2 text-left text-sm text-white transition-colors hover:text-white/80"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
