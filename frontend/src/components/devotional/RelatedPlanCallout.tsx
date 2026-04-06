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
    <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6">
      <p className="text-xs uppercase tracking-widest text-white/70">
        Go Deeper
      </p>
      <p className="mt-2 text-base font-semibold text-white">{planTitle}</p>
      <p className="mt-1 text-sm text-white/60">{planDuration}-day plan</p>
      <Link
        to={`/reading-plans/${planId}`}
        onClick={handleClick}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
      >
        {ctaText}
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
