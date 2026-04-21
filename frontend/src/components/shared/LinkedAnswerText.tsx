import { Link } from 'react-router-dom'
import { parseVerseReferences } from '@/lib/parse-verse-references'

interface LinkedAnswerTextProps {
  text: string
}

export function LinkedAnswerText({ text }: LinkedAnswerTextProps) {
  const refs = parseVerseReferences(text)

  if (refs.length === 0) {
    return <>{text}</>
  }

  const segments: React.ReactNode[] = []
  let lastIndex = 0

  for (const ref of refs) {
    // Plain text before this reference
    if (ref.startIndex > lastIndex) {
      segments.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, ref.startIndex)}</span>,
      )
    }

    // Linked reference
    segments.push(
      <Link
        key={`ref-${ref.startIndex}`}
        to={`/bible/${ref.bookSlug}/${ref.chapter}#verse-${ref.verseStart}`}
        className="font-semibold text-white underline decoration-primary/60 underline-offset-2 transition-[text-decoration-color,text-decoration-thickness] duration-base motion-reduce:transition-none hover:decoration-primary hover:decoration-2"
      >
        {ref.raw}
      </Link>,
    )

    lastIndex = ref.endIndex
  }

  // Remaining text after last reference
  if (lastIndex < text.length) {
    segments.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>)
  }

  return <>{segments}</>
}
