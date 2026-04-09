import { useState, useCallback, Fragment } from 'react'
import { parseReferences } from '@/lib/bible/notes/referenceParser'
import { useToastSafe } from '@/components/ui/Toast'
import type { NoteData } from '@/types/my-bible'
import { timeAgo } from '@/lib/time'

interface NoteCardProps {
  data: NoteData
  verseText: string | null
  createdAt: number
  updatedAt: number
}

function NoteBody({ body }: { body: string }) {
  const { showToast } = useToastSafe()
  const refs = parseReferences(body)

  if (refs.length === 0) return <>{body}</>

  const segments: Array<{ text: string; isRef: boolean }> = []
  let lastIndex = 0

  for (const ref of refs) {
    if (ref.startIndex > lastIndex) {
      segments.push({ text: body.slice(lastIndex, ref.startIndex), isRef: false })
    }
    segments.push({ text: ref.text, isRef: true })
    lastIndex = ref.endIndex
  }
  if (lastIndex < body.length) {
    segments.push({ text: body.slice(lastIndex), isRef: false })
  }

  const handleRefClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    showToast('Coming in a future update', 'success')
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.isRef ? (
          <button
            key={i}
            type="button"
            onClick={handleRefClick}
            className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
          >
            {seg.text}
          </button>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  )
}

export function NoteCard({ data, verseText, createdAt, updatedAt }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isEdited = updatedAt > createdAt

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => !prev)
  }, [])

  return (
    <div className="mt-2 space-y-2">
      {verseText ? (
        <p className="text-sm text-white/60">{verseText}</p>
      ) : (
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      )}
      <div className={expanded ? '' : 'line-clamp-4'}>
        <p className="text-sm text-white">
          <NoteBody body={data.body} />
        </p>
      </div>
      {data.body.length > 400 && (
        <button
          type="button"
          onClick={toggleExpand}
          className="cursor-pointer text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      {isEdited && (
        <p className="text-xs text-white/40">
          edited {timeAgo(new Date(updatedAt).toISOString())}
        </p>
      )}
    </div>
  )
}
