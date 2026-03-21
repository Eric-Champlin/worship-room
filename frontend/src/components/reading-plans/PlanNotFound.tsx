import { Link } from 'react-router-dom'

import { Layout } from '@/components/Layout'

export function PlanNotFound() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Plan Not Found
          </h1>
          <p className="mb-6 text-base text-text-light sm:text-lg">
            The reading plan you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            to="/reading-plans"
            className="font-script text-2xl text-primary transition-colors hover:text-primary-lt"
          >
            Browse Reading Plans
          </Link>
        </div>
      </div>
    </Layout>
  )
}
