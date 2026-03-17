import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TypewriterInput } from './TypewriterInput'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'

const VIDEO_MAX_OPACITY = 0.4
const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4'

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

function useVideoFade(video: HTMLVideoElement | null) {
  useEffect(() => {
    if (!video) return

    let rafId: number

    const updateOpacity = () => {
      if (!video || video.readyState < 2) {
        rafId = requestAnimationFrame(updateOpacity)
        return
      }

      const { currentTime, duration } = video
      if (!duration || duration === Infinity) {
        rafId = requestAnimationFrame(updateOpacity)
        return
      }

      const FADE_DURATION = 0.5
      let opacity = VIDEO_MAX_OPACITY

      if (currentTime < FADE_DURATION) {
        opacity = (currentTime / FADE_DURATION) * VIDEO_MAX_OPACITY
      } else if (currentTime > duration - FADE_DURATION) {
        opacity = ((duration - currentTime) / FADE_DURATION) * VIDEO_MAX_OPACITY
      }

      video.style.opacity = String(opacity)
      rafId = requestAnimationFrame(updateOpacity)
    }

    const handleEnded = () => {
      video.style.opacity = '0'
      setTimeout(() => {
        video.currentTime = 0
        video.play().catch(() => {})
      }, 100)
    }

    rafId = requestAnimationFrame(updateOpacity)
    video.addEventListener('ended', handleEnded)

    return () => {
      cancelAnimationFrame(rafId)
      video.removeEventListener('ended', handleEnded)
    }
  }, [video])
}

export function HeroSection() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useVideoFade(videoEl)

  const handleInputSubmit = (value: string) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to get AI-powered guidance')
      return
    }
    navigate(`/daily?tab=pray&q=${encodeURIComponent(value)}`)
  }

  return (
    <section
      aria-label="Welcome to Worship Room"
      className={cn(
        'relative flex w-full flex-col items-center justify-start overflow-hidden text-center',
        'px-4 pt-36 pb-20 sm:pt-40 sm:pb-24 lg:pt-44 lg:pb-28',
        'bg-hero-bg antialiased'
      )}
    >
      {!prefersReducedMotion && (
        <video
          ref={setVideoEl}
          autoPlay
          muted
          playsInline
          aria-hidden="true"
          className="hero-video pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0 }}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      )}

      {/* Top gradient overlay */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-1/3 bg-gradient-to-b from-hero-bg via-hero-bg/50 to-transparent"
        aria-hidden="true"
      />
      {/* Bottom gradient overlay */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/3 bg-gradient-to-t from-hero-bg via-hero-bg/50 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <h1
          className="hero-gradient-text mb-4 pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl"
          style={{
            color: 'white',
            backgroundImage: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          How&apos;re You<br />Feeling Today?
        </h1>

        <p className="mx-auto mb-10 max-w-xl font-sans text-base text-white/60 sm:text-lg lg:text-xl">
          Get AI-powered guidance built on Biblical principles.
        </p>

        <TypewriterInput onSubmit={handleInputSubmit} variant="glass" />

        <p className="mt-5 font-sans text-sm text-white/50">
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
