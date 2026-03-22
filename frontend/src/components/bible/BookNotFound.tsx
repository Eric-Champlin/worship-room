import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

import { Layout } from '@/components/Layout'

export function BookNotFound() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <BookOpen size={48} className="mb-4 text-text-light" />
        <h1 className="text-xl font-semibold text-text-dark">
          Book not found
        </h1>
        <p className="mt-2 text-text-light">
          The book you&rsquo;re looking for doesn&rsquo;t exist.
        </p>
        <Link
          to="/bible"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt"
        >
          Browse the Bible
        </Link>
      </div>
    </Layout>
  )
}
