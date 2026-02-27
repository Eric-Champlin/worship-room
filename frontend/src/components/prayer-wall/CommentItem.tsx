import { Link } from 'react-router-dom'
import type { PrayerComment } from '@/types/prayer-wall'
import { Avatar } from './Avatar'
import { timeAgo } from '@/lib/time'
import { getMockUserByName } from '@/mocks/prayer-wall-mock-data'

interface CommentItemProps {
  comment: PrayerComment
  onReply: (authorName: string) => void
}

function parseContent(text: string) {
  const parts = text.split(/(@[\p{L}\p{N}_]+)/gu)
  return parts.map((part, i) => {
    const key = `part-${i}`
    if (part.startsWith('@')) {
      const name = part.slice(1)
      const user = getMockUserByName(name)
      if (user) {
        return (
          <Link
            key={key}
            to={`/prayer-wall/user/${user.id}`}
            className="font-semibold text-primary hover:underline"
          >
            {part}
          </Link>
        )
      }
      return (
        <span key={key} className="font-semibold text-primary">
          {part}
        </span>
      )
    }
    return <span key={key}>{part}</span>
  })
}

export function CommentItem({ comment, onReply }: CommentItemProps) {
  return (
    <div className="flex gap-2.5 py-2">
      <Avatar
        firstName={comment.authorName}
        lastName=""
        avatarUrl={comment.authorAvatarUrl}
        size="sm"
        userId={comment.userId}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-text-dark">
            {comment.authorName}
          </span>
          <span className="text-xs text-text-light"> &mdash; </span>
          <time dateTime={comment.createdAt} className="text-xs text-text-light">
            {timeAgo(comment.createdAt)}
          </time>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-text-dark">
          {parseContent(comment.content)}
        </p>
        <button
          type="button"
          onClick={() => onReply(comment.authorName)}
          className="mt-1 min-h-[44px] px-2 text-xs text-text-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded sm:min-h-0 sm:px-0"
        >
          Reply
        </button>
      </div>
    </div>
  )
}
