import { useNavigate } from 'react-router-dom'
import { TypewriterInput } from './TypewriterInput'
import { cn } from '@/lib/utils'

export function HeroSection() {
  const navigate = useNavigate()

  const handleInputSubmit = (value: string) => {
    navigate(`/scripture?q=${encodeURIComponent(value)}`)
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
        backgroundImage: [
          'radial-gradient(ellipse 100% 60% at 50% 0%, #3B0764 0%, transparent 70%)',
          'linear-gradient(to bottom, #0D0620 0%, #1E0B3E 35%, #4A1D96 52%, #EDE9FE 100%)',
        ].join(', '),
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-4 font-sans text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
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
            className="font-semibold text-white underline underline-offset-2 transition-colors hover:text-white/80"
          >
            Take a 30-second quiz
          </button>{' '}
          and we&apos;ll help you find your path.
        </p>
      </div>
    </section>
  )
}
