const SMALL_WORDS = new Set(['and', 'of', 'the', 'in', 'for', 'to', 'a', 'an'])

/**
 * Formats a DevotionalTheme slug into title case for display.
 * e.g., 'anxiety-and-peace' → 'Anxiety and Peace'
 */
export function formatThemeName(theme: string): string {
  return theme
    .split('-')
    .map((word, i) =>
      i === 0 || !SMALL_WORDS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(' ')
}
