import { Layout } from '@/components/Layout'

export function Daily() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Daily Verse & Song
          </h1>
          <p className="mb-6 text-base leading-relaxed text-text-dark sm:text-lg">
            Start each day with a scripture verse and a worship song
            recommendation chosen just for you. A daily moment of peace
            and inspiration is on its way.
          </p>
          <p
            className="text-2xl text-primary sm:text-3xl"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Coming Soon
          </p>
        </div>
      </div>
    </Layout>
  )
}
