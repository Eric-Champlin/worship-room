import { getBibleGatewayUrl } from '@/data/bible'

interface ChapterPlaceholderProps {
  bookName: string
  chapter: number
}

export function ChapterPlaceholder({ bookName, chapter }: ChapterPlaceholderProps) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h2 className="mb-4 text-xl font-semibold text-white">
        Full text coming soon
      </h2>
      <p className="mb-6 text-white/60">
        We&rsquo;re working on adding the full text of {bookName}. In the
        meantime, you can read it on BibleGateway.
      </p>
      <a
        href={getBibleGatewayUrl(bookName, chapter)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt"
      >
        Read on BibleGateway
      </a>
    </div>
  )
}
