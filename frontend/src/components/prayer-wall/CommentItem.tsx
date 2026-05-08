import { Link } from 'react-router-dom'
import type { PrayerComment } from '@/types/prayer-wall'
import type { PostType } from '@/constants/post-types'
import { Avatar } from './Avatar'
import { ResolvedBadge } from './ResolvedBadge'
import { timeAgo } from '@/lib/time'
import { useAuth } from '@/hooks/useAuth'
import { getMockUserByName } from '@/mocks/prayer-wall-mock-data'

interface CommentItemProps {
  comment: PrayerComment
  /** Spec 4.4 — used to gate the 'This helped' button to question posts only. */
  postType: PostType
  /**
   * Spec 4.4 — used to gate the 'This helped' button to the post author only.
   * Mirrors `PrayerRequest.userId`, which is nullable on anonymous posts. The
   * author conditional below correctly hides the button when this is null
   * (no authenticated `user.id` ever equals null).
   */
  postAuthorId: string | null
  onReply: (authorName: string) => void
  /** Spec 4.4 — fired when the post author taps "This helped" on a comment. */
  onResolve?: (commentId: string) => void
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

export function CommentItem({
  comment,
  postType,
  postAuthorId,
  onReply,
  onResolve,
}: CommentItemProps) {
  const { user } = useAuth()
  // Spec 4.4 — author-only conditional. user?.id (not user.id) — unauthenticated → undefined → false.
  // The post author CAN mark their own comments helpful (W10 — do NOT add a userId !== check).
  // No `!comment.isDeleted` guard: deleted comments are filtered out by the
  // mapper before they reach this component (W26), so the check would never
  // fire. Don't re-add it without revisiting the soft-delete render path.
  const isPostAuthor = user?.id === postAuthorId
  const showHelpedButton =
    postType === 'question' && isPostAuthor && onResolve !== undefined

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
          <span className="text-sm font-semibold text-white">
            {comment.authorName}
          </span>
          {comment.isHelpful && <ResolvedBadge />}
          <span className="text-xs text-white/40"> &mdash; </span>
          <time dateTime={comment.createdAt} className="text-xs text-white/60">
            {timeAgo(comment.createdAt)}
          </time>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
          {parseContent(comment.content)}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onReply(comment.authorName)}
            className="min-h-[44px] px-2 text-xs text-white/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded sm:min-h-0 sm:px-0"
          >
            Reply
          </button>
          {showHelpedButton && (
            <button
              type="button"
              onClick={() => onResolve!(comment.id)}
              className="min-h-[44px] px-2 text-xs text-cyan-300/70 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:rounded sm:min-h-0 sm:px-0"
              aria-label={
                comment.isHelpful
                  ? 'Marked as most helpful'
                  : 'Mark this comment as most helpful'
              }
            >
              {comment.isHelpful ? 'Most helpful' : 'This helped'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
