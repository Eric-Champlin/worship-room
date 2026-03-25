import { Link } from 'react-router-dom'
import { getTodaysDevotional } from '@/data/devotionals'

export function DevotionalTeaser() {
  const devotional = getTodaysDevotional()

  return (
    <section className="bg-hero-dark px-4 py-16 text-center sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">
          Daily Devotional
        </p>
        <h2 className="mb-3 font-serif text-2xl text-white sm:text-3xl">
          Start Each Morning with God
        </h2>
        <p className="mb-6 text-base text-white/50">Today: {devotional.title}</p>
        <Link
          to="/daily?tab=devotional"
          className="inline-block rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white transition-colors hover:bg-white/15"
        >
          Read Today&apos;s Devotional
        </Link>
      </div>
    </section>
  )
}
