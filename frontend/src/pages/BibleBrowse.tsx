import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { BibleBooksMode } from '@/components/bible/BibleBooksMode'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'
import { BIBLE_BROWSE_METADATA } from '@/lib/seo/routeMetadata'

function BibleBrowseInner() {
  const { isOpen, close } = useBibleDrawer()

  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...BIBLE_BROWSE_METADATA} />

      <main id="main-content" className="relative z-10 flex-1">
        <section className="relative z-10 w-full px-4 pt-28 pb-12 text-center">
          <h1
            className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
            style={GRADIENT_TEXT_STYLE}
          >
            Browse Books
          </h1>
        </section>

        <div className="mx-auto max-w-5xl px-4 pb-16 lg:px-8">
          <BibleBooksMode />
        </div>
      </main>

      <SiteFooter />

      <BibleDrawer isOpen={isOpen} onClose={close} ariaLabel="Books of the Bible">
        <DrawerViewRouter onClose={close} />
      </BibleDrawer>
    </BackgroundCanvas>
  )
}

export function BibleBrowse() {
  return (
    <BibleDrawerProvider>
      <BibleBrowseInner />
    </BibleDrawerProvider>
  )
}
