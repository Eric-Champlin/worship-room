import { Layout } from '@/components/Layout'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'

const STUB_CONFIG = {
  my: { title: 'My Bible', message: 'My Bible — coming in BB-14', description: 'Your personal highlights, notes, and bookmarks.' },
  plans: { title: 'Reading Plans', message: 'Plans browser — coming in BB-21.5', description: 'Guided daily reading plans.' },
  search: { title: 'Bible Search', message: 'Search — coming in BB-42', description: 'Search the Bible by verses, words, and phrases.' },
} as const

interface BibleStubProps {
  page: keyof typeof STUB_CONFIG
}

export function BibleStub({ page }: BibleStubProps) {
  const config = STUB_CONFIG[page]
  return (
    <Layout>
      <SEO title={`${config.title} — Bible (WEB)`} description={config.description} />
      <div className="min-h-screen bg-dashboard-dark">
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
            {config.title}
          </h1>
        </section>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-lg text-white/50">{config.message}</p>
        </div>
      </div>
    </Layout>
  )
}
