import { Link } from 'react-router-dom'

import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'

export function ChallengeNotFound() {
  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <Navbar transparent />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Challenge Not Found
          </h1>
          <p className="mb-6 text-base text-white/60 sm:text-lg">
            The challenge you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            to="/challenges"
            className="font-script text-2xl text-primary transition-colors hover:text-primary-lt"
          >
            Browse Challenges
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
