/** Shared gradient strings used across page backgrounds and heroes */

import type { CSSProperties, ReactNode } from 'react'

/** White-to-purple gradient — used on JourneySection, StartingPointQuiz, HeroSection, TypewriterInput */
export const WHITE_PURPLE_GRADIENT = 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)'

/** Inline style for gradient text headings — matches HeroSection.tsx */
export const GRADIENT_TEXT_STYLE: CSSProperties = {
  color: 'white',
  backgroundImage: WHITE_PURPLE_GRADIENT,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

/**
 * Renders heading text with one word in Caveat script font.
 * If scriptWord is not found in the text, returns the text unchanged.
 */
export function renderWithScriptAccent(text: string, scriptWord?: string): ReactNode {
  if (!scriptWord) return text
  const idx = text.indexOf(scriptWord)
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const after = text.slice(idx + scriptWord.length)
  return (
    <>
      {before}<span className="font-script">{scriptWord}</span>{after}
    </>
  )
}
