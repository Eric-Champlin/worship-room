interface UserQuestionBubbleProps {
  question: string
}

export function UserQuestionBubble({ question }: UserQuestionBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl bg-primary/20 p-4 sm:max-w-[80%]">
        <p className="text-text-dark">{question}</p>
      </div>
    </div>
  )
}
