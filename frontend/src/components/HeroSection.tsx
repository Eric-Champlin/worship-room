import { useNavigate } from 'react-router-dom'
import { TypewriterInput } from './TypewriterInput'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'

export function HeroSection() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()

  const handleInputSubmit = (value: string) => {
    if (!isLoggedIn) {
      authModal?.openAuthModal('Sign in to get AI-powered guidance')
      return
    }
    navigate(`/daily?tab=pray&q=${encodeURIComponent(value)}`)
  }

  return (
    <section
      aria-label="Welcome to Worship Room"
      className={cn(
        'relative flex w-full flex-col items-center justify-start text-center',
        'px-4 pt-44 pb-28 sm:pt-48 sm:pb-32 lg:pt-56 lg:pb-40',
        'antialiased'
      )}
      style={{
        backgroundImage: 'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-4 font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
          How&apos;re You Feeling Today?
        </h1>

        <p className="mx-auto mb-10 max-w-xl font-sans text-base text-white/85 sm:text-lg lg:text-xl">
          Get AI-powered guidance built on Biblical principles.
        </p>

        <TypewriterInput onSubmit={handleInputSubmit} />

        <p className="mt-5 font-sans text-sm text-white/90">
          Not sure where to start?{' '}
          <button
            type="button"
            onClick={() => {
              document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="rounded font-semibold text-white underline underline-offset-2 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            Take a 30-second quiz
          </button>{' '}
          and we&apos;ll help you find your path.
        </p>
      </div>
    </section>
  )
}
