import { Layout } from '@/components/Layout'
import { BibleBooksMode } from '@/components/bible/BibleBooksMode'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'
import { BIBLE_BROWSE_METADATA } from '@/lib/seo/routeMetadata'

export function BibleBrowse() {
  return (
    <Layout>
      <SEO {...BIBLE_BROWSE_METADATA} />
      <div className="min-h-screen bg-hero-bg">
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
            Browse Books
          </h1>
        </section>
        <div className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
          <BibleBooksMode />
        </div>
      </div>
    </Layout>
  )
}
