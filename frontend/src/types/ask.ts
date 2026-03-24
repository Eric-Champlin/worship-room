export interface AskVerse {
  reference: string // e.g., "Romans 8:28"
  text: string // Full WEB translation text
  explanation: string // 1 sentence on how it applies
}

export interface AskResponse {
  id: string // e.g., "suffering", "forgiveness", "fallback"
  topic: string // Display topic name
  answer: string // 2-3 paragraphs, warm second-person voice
  verses: AskVerse[] // 3 supporting verses
  encouragement: string // Closing encouragement (1 sentence)
  prayer: string // Suggested prayer (1 paragraph)
}

export interface AskFeedback {
  questionId: string // Matched response ID
  helpful: boolean
  timestamp: string // ISO 8601
}
