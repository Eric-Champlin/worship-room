import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { PrayerComment } from '@/types/prayer-wall'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'
import { useAuthModal } from './AuthModalProvider'

const MAX_VISIBLE_COMMENTS = 5

interface CommentsSectionProps {
  prayerId: string
  isOpen: boolean
  comments: PrayerComment[]
  totalCount: number
  onSubmitComment: (prayerId: string, content: string) => void
}

export function CommentsSection({
  prayerId,
  isOpen,
  comments,
  totalCount,
  onSubmitComment,
}: CommentsSectionProps) {
  const authModal = useAuthModal()
  const [replyTo, setReplyTo] = useState('')
  const visibleComments = comments.slice(0, MAX_VISIBLE_COMMENTS)

  const handleReply = (authorName: string) => {
    setReplyTo(`@${authorName} `)
  }

  return (
    <div
      className={cn(
        '-m-0.5 overflow-hidden p-0.5 transition-all duration-300 ease-in-out',
        isOpen ? 'visible max-h-[1200px] opacity-100' : 'invisible max-h-0 opacity-0',
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <div className="mt-3 border-t border-gray-100 pt-3">
        {visibleComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={handleReply}
          />
        ))}

        {totalCount > MAX_VISIBLE_COMMENTS && (
          <Link
            to={`/prayer-wall/${prayerId}`}
            className="mt-2 block text-sm text-primary hover:underline"
          >
            See more comments (showing {MAX_VISIBLE_COMMENTS} of {totalCount})
          </Link>
        )}

        <CommentInput
          prayerId={prayerId}
          onSubmit={onSubmitComment}
          initialValue={replyTo}
          onLoginClick={authModal?.openAuthModal}
        />
      </div>
    </div>
  )
}
