import { Layout } from '@/components/Layout'

export function Insights() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Reflect
          </h1>
          <p className="mb-6 text-base leading-relaxed text-text-dark sm:text-lg">
            Track your spiritual journey and discover patterns in your growth.
            See how far you've come — this space will help you reflect on
            what God is doing in your life.
          </p>
          <p className="font-script text-2xl text-primary sm:text-3xl">
            Coming Soon
          </p>
        </div>
      </div>
    </Layout>
  )
}
