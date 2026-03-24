import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { SEO } from '@/components/SEO'
import { SiteFooter } from '@/components/SiteFooter'
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal'
import { getVerseById, getSongOfTheDay } from '@/mocks/daily-experience-mock-data'
import {
  SPOTIFY_EMBED_BASE,
  SPOTIFY_PLAYLIST_URL,
} from '@/constants/daily-experience'
import { cn } from '@/lib/utils'

export function SharedVerse() {
  const { id } = useParams<{ id: string }>()
  const verse = id ? getVerseById(id) : undefined
  const song = getSongOfTheDay(new Date().getDate())
  const [referenceVisible, setReferenceVisible] = useState(false)

  if (!verse) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-text-dark">
              Verse not found
            </h1>
            <p className="mb-4 text-text-light">
              This verse may no longer be available.
            </p>
            <Link
              to="/daily"
              className="text-primary underline hover:text-primary-light"
            >
              Go to Daily Hub
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const verseSuffix = ' — from the World English Bible.'
  const maxTextLen = 155 - verseSuffix.length
  const verseDescription = verse.text.length > maxTextLen
    ? verse.text.slice(0, maxTextLen).trim() + '...' + verseSuffix
    : verse.text + verseSuffix

  return (
    <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
      <SEO
        title={verse.reference}
        description={verseDescription}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar transparent />

      <main id="main-content">
        {/* Hero */}
        <section
          className="relative flex w-full flex-col items-center px-4 pb-10 pt-32 text-center antialiased sm:pb-12 sm:pt-36 lg:pb-14 lg:pt-40"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
          }}
        >
          <p className="mb-6 font-script text-3xl font-bold text-white">
            Worship Room
          </p>
          <blockquote className="mx-auto max-w-2xl font-serif text-xl leading-relaxed text-white sm:text-2xl lg:text-3xl">
            &ldquo;<KaraokeTextReveal
              text={verse.text}
              revealDuration={2500}
              onRevealComplete={() => setReferenceVisible(true)}
            />&rdquo;
          </blockquote>
          <p
            className={cn(
              'mt-3 text-sm text-white/80 transition-opacity duration-300',
              referenceVisible ? 'opacity-100' : 'opacity-0',
            )}
          >
            {verse.reference} WEB
          </p>
        </section>

        {/* Spotify + CTAs */}
        <section className="mx-auto max-w-md px-4 py-10 text-center">
          <p className="mb-3 text-sm text-text-light">
            While you&apos;re here, listen to today&apos;s worship pick
          </p>
          <iframe
            title={`${song.title} by ${song.artist}`}
            src={`${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
          <a
            href={SPOTIFY_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-text-light transition-colors hover:text-primary"
          >
            Follow our playlist on Spotify &rarr;
          </a>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/"
              className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Explore Worship Room &rarr;
            </Link>
            <Link
              to="/daily"
              className="text-sm text-primary underline transition-colors hover:text-primary-light"
            >
              Start your daily time with God &rarr;
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
