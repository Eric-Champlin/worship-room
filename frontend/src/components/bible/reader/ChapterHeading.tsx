interface ChapterHeadingProps {
  bookName: string
  chapter: number
}

export function ChapterHeading({ bookName, chapter }: ChapterHeadingProps) {
  return (
    <header className="mb-8 text-center">
      <h1>
        <span
          className="block font-serif text-2xl font-normal tracking-wide sm:text-3xl"
          style={{ color: 'var(--reader-text)' }}
        >
          {bookName}
        </span>
        <span
          className="mt-1 block font-serif text-6xl font-light sm:text-7xl"
          style={{ color: 'var(--reader-verse-num)' }}
        >
          {chapter}
        </span>
      </h1>
      <div
        className="mx-auto mt-4 max-w-[4rem] border-b"
        style={{ borderColor: 'var(--reader-divider)' }}
      />
    </header>
  )
}
