import { Link } from 'react-router-dom'

import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { Button } from '@/components/ui/Button'

export function ChallengeNotFound() {
  return (
    <div className="min-h-screen bg-dashboard-dark">
      <Navbar transparent />
      <BackgroundCanvas>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Challenge Not Found
            </h1>
            <p className="mb-6 text-base text-white/60 sm:text-lg">
              The challenge you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button variant="subtle" size="md" asChild>
              <Link to="/grow?tab=challenges">Browse Challenges</Link>
            </Button>
          </div>
        </div>
      </BackgroundCanvas>
      <SiteFooter />
    </div>
  )
}
