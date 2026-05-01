import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
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
    <FrostedCard variant="accent" eyebrow="Go Deeper" className="mt-8">
      <p className="text-base font-semibold text-white">{planTitle}</p>
      <p className="mt-1 text-sm text-white/60">{planDuration}-day plan</p>
      <Button variant="subtle" size="md" asChild>
        <Link to={`/reading-plans/${planId}`} onClick={handleClick} className="mt-4">
          {ctaText}
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </Button>
    </FrostedCard>
  )
}
