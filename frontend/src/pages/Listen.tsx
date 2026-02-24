import { Layout } from '@/components/Layout'

export function Listen() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Listen
          </h1>
          <p className="mb-6 text-base leading-relaxed text-text-dark sm:text-lg">
            Hear God's Word spoken over you. Audio scripture, spoken prayers, and
            calming content for rest and renewal — coming to this space soon.
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
