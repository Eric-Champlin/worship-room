import { ClipboardCopy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { AskResponse } from '@/types/ask'

interface ConversationPair {
  question: string
  response: AskResponse
}

interface SaveConversationButtonProps {
  conversation: ConversationPair[]
}

export function SaveConversationButton({ conversation }: SaveConversationButtonProps) {
  const { showToast } = useToast()

  if (conversation.length < 2) return null

  const handleCopy = async () => {
    const lines = conversation.map(({ question, response }) => {
      const answerPreview =
        response.answer.length > 150 ? response.answer.slice(0, 150) + '...' : response.answer
      const verses = response.verses.map((v) => v.reference).join(', ')
      return `Q: ${question}\nA: ${answerPreview}\nVerses: ${verses}`
    })
    const fullText =
      lines.join('\n\n') + '\n\n\u2014 Saved from Worship Room (worshiproom.com)'

    try {
      await navigator.clipboard.writeText(fullText)
      showToast('Conversation copied — ready to share.')
    } catch (_e) {
      showToast("We couldn't copy that. Try selecting the text and copying manually.", 'error')
    }
  }

  return (
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-white/10 border border-white/10 px-3 py-2 sm:w-auto',
          'text-sm text-white/70 hover:bg-white/15',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'transition-colors',
        )}
      >
        <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
        Save this conversation
      </button>
    </div>
  )
}
