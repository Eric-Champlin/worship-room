import { useMemo } from 'react'
import { tokenizeQuery } from '@/lib/bible/myBible/searchPredicate'

interface HighlightedTextProps {
  text: string
  query: string
}

/**
 * Renders text with matching substrings wrapped in <mark> elements.
 * When query is empty, renders plain text with zero overhead.
 * Multi-token queries highlight each token independently.
 */
export function HighlightedText({ text, query }: HighlightedTextProps) {
  const tokens = useMemo(() => tokenizeQuery(query), [query])

  if (tokens.length === 0) return <>{text}</>

  // Build a regex that matches any token (case-insensitive)
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')

  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = tokens.some((t) => part.toLowerCase() === t.toLowerCase())
        return isMatch ? (
          <mark key={i} className="bg-primary/25 text-white">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}
