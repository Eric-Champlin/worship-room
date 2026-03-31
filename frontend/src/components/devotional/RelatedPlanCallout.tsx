import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'

interface RelatedPlanCalloutProps {
  planId: string
  planTitle: string
  planDuration: number
  planStatus: 'unstarted' | 'active' | 'paused' | 'completed'
}

export function RelatedPlanCallout({
  planId,
  planTitle,
  planDuration,
  planStatus,
}: RelatedPlanCalloutProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()

  const ctaText =
    planStatus === 'unstarted' ? 'Start this plan' : 'Continue this plan'

  const handleClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault()
      authModal?.openAuthModal('Sign in to start this reading plan')
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-wider text-white/60">
        Go Deeper
      </p>
      <p className="mt-2 text-base font-semibold text-white">{planTitle}</p>
      <p className="mt-1 text-sm text-white/50">{planDuration}-day plan</p>
      <Link
        to={`/reading-plans/${planId}`}
        onClick={handleClick}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-lt transition-colors hover:text-primary"
      >
        {ctaText}
        <ChevronRight size={14} />
      </Link>
    </div>
  )
}
