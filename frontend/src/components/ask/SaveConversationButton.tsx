import { ClipboardCopy } from 'lucide-react'
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
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] sm:w-auto"
      >
        <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
        Save this conversation
      </button>
    </div>
  )
}
