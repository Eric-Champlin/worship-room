import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'

const MAX_COMMENT_LENGTH = 500

interface CommentInputProps {
  prayerId: string
  onSubmit: (prayerId: string, content: string) => void
  initialValue?: string
  onLoginClick?: () => void
}

export function CommentInput({ prayerId, onSubmit, initialValue = '', onLoginClick }: CommentInputProps) {
  const { isLoggedIn } = useAuth()
  const [value, setValue] = useState(initialValue)
  const [crisisDetected, setCrisisDetected] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialValue && inputRef.current) {
      setValue(initialValue)
      inputRef.current.focus()
    }
  }, [initialValue])

  if (!isLoggedIn) {
    if (onLoginClick) {
      return (
        <button
          type="button"
          onClick={onLoginClick}
          className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-text-light transition-colors hover:border-primary"
        >
          Log in to comment
        </button>
      )
    }
    return (
      <Link
        to="/login"
        className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-light transition-colors hover:border-primary"
      >
        Log in to comment
      </Link>
    )
  }

  // TODO(phase-3): replace keyword check with backend crisis detection API.
  // See .claude/rules/01-ai-safety.md — backend check is mandatory before production.
  const handleSubmit = () => {
    if (!value.trim()) return
    if (containsCrisisKeyword(value)) {
      setCrisisDetected(true)
      return
    }
    onSubmit(prayerId, value.trim())
    setValue('')
    setCrisisDetected(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= MAX_COMMENT_LENGTH) {
              setValue(e.target.value)
              setCrisisDetected(false)
            }
          }}
          onKeyDown={handleKeyDown}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Write a comment..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Write a comment"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className={cn(
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded',
            value.trim() ? 'text-primary hover:text-primary-lt' : 'text-gray-300',
          )}
          aria-label="Submit comment"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {crisisDetected && (
        <div role="alert" className="mt-3 rounded-lg border border-danger/30 bg-red-50 p-3">
          <p className="mb-1 text-xs font-semibold text-danger">
            If you are in crisis, please reach out for help:
          </p>
          <ul className="space-y-0.5 text-xs text-text-dark">
            <li>{CRISIS_RESOURCES.suicide_prevention.name}: <a href={`tel:${CRISIS_RESOURCES.suicide_prevention.phone}`} className="font-medium text-primary underline">{CRISIS_RESOURCES.suicide_prevention.phone}</a></li>
            <li>{CRISIS_RESOURCES.crisis_text.name}: {CRISIS_RESOURCES.crisis_text.text}</li>
            <li>{CRISIS_RESOURCES.samhsa.name}: <a href={`tel:${CRISIS_RESOURCES.samhsa.phone}`} className="font-medium text-primary underline">{CRISIS_RESOURCES.samhsa.phone}</a></li>
          </ul>
        </div>
      )}
    </>
  )
}
