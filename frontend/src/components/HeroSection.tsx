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
        'px-4 pt-32 pb-10 sm:pt-36 sm:pb-14 lg:pt-44 lg:pb-20',
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
        <h1 className="mb-4 font-sans text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          How&apos;re You Feeling Today?
        </h1>

        <p className="mx-auto mb-10 max-w-xl font-sans text-base text-white/85 sm:text-lg lg:text-xl">
          Get AI-powered guidance built on Biblical principles.
        </p>

        <TypewriterInput onSubmit={handleInputSubmit} />
      </div>
    </section>
  )
}
