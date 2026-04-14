import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { SEO } from '@/components/SEO'
import { SHARED_VERSE_METADATA } from '@/lib/seo/routeMetadata'
import { SiteFooter } from '@/components/SiteFooter'
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal'
import { SharePanel } from '@/components/sharing/SharePanel'
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
  const [showSharePanel, setShowSharePanel] = useState(false)

  if (!verse) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
        <SEO title="Verse Not Found" description="This verse may no longer be available on Worship Room." noIndex />
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
      {/* BB-40: dynamic verse.reference title overrides static base; description comes from verse content */}
      <SEO
        {...SHARED_VERSE_METADATA}
        title={verse.reference}
        description={verseDescription}
      />
      <Navbar transparent />

      <main id="main-content">
        <h1 className="sr-only">Shared Verse</h1>
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
              'mt-3 text-sm text-white/80 transition-opacity motion-reduce:transition-none duration-base',
              referenceVisible ? 'opacity-100' : 'opacity-0',
            )}
          >
            {verse.reference} WEB
          </p>
          <button
            type="button"
            onClick={() => setShowSharePanel(true)}
            disabled={!referenceVisible}
            aria-hidden={!referenceVisible}
            tabIndex={referenceVisible ? 0 : -1}
            className={cn(
              'mt-6 rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white transition-all motion-reduce:transition-none hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark',
              referenceVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            Share this verse
          </button>
          <SharePanel
            verseText={verse.text}
            reference={`${verse.reference} WEB`}
            isOpen={showSharePanel}
            onClose={() => setShowSharePanel(false)}
          />
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
