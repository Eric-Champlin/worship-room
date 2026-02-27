export const CRISIS_RESOURCES = {
  suicide_prevention: {
    name: '988 Suicide & Crisis Lifeline',
    phone: '988',
    link: 'https://988lifeline.org',
  },
  crisis_text: {
    name: 'Crisis Text Line',
    text: 'Text HOME to 741741',
    link: 'https://www.crisistextline.org',
  },
  samhsa: {
    name: 'SAMHSA National Helpline',
    phone: '1-800-662-4357',
    link: 'https://www.samhsa.gov/find-help/national-helpline',
  },
}

export const SELF_HARM_KEYWORDS = [
  'suicide',
  'kill myself',
  'end it all',
  'not worth living',
  'hurt myself',
  'end my life',
  'want to die',
  'better off dead',
]

export function containsCrisisKeyword(text: string): boolean {
  const lower = text.toLowerCase()
  return SELF_HARM_KEYWORDS.some((kw) => lower.includes(kw))
}
