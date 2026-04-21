interface UserQuestionBubbleProps {
  question: string
}

export function UserQuestionBubble({ question }: UserQuestionBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl rounded-tr-sm border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-4 sm:max-w-[80%]">
        <p className="text-white">{question}</p>
      </div>
    </div>
  )
}
