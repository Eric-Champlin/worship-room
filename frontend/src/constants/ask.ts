export const ASK_TOPIC_CHIPS = [
  'Why does God allow suffering?',
  'How do I forgive someone?',
  'What does the Bible say about anxiety?',
  "How do I know God's plan for me?",
  'Is it okay to doubt?',
  'How do I pray better?',
] as const

export const POPULAR_TOPICS = [
  { topic: 'Understanding Suffering', description: 'Why pain exists and how to endure it', starterQuestion: 'Why does God allow suffering?' },
  { topic: 'Finding Forgiveness', description: 'Letting go of hurt and finding freedom', starterQuestion: 'How do I forgive someone who hurt me?' },
  { topic: 'Overcoming Anxiety', description: 'Finding peace when worry overwhelms', starterQuestion: 'What does the Bible say about anxiety?' },
  { topic: "Knowing God's Will", description: 'Discovering purpose and direction', starterQuestion: "How do I know God's plan for my life?" },
  { topic: 'Building Stronger Faith', description: 'Growing deeper in trust and belief', starterQuestion: 'How can I grow stronger in my faith?' },
] as const

export const ASK_MAX_LENGTH = 500
export const ASK_LOADING_DELAY_MS = 2000
export const ASK_FEEDBACK_KEY = 'wr_chat_feedback'
