import {
  DISPLAYABLE_TAGS,
  HELP_TAG_LABELS,
  HELP_TAG_ICONS,
  isDisplayableTag,
  type HelpTag,
} from '@/constants/ways-to-help'

interface WaysToHelpPillsProps {
  tags: HelpTag[]
}

/**
 * Spec 4.7b — Renders only the displayable tags (filters out just_prayer per
 * D8 / W5). Returns null when no displayable tags so no empty row renders
 * (W6). Pills are non-interactive informational spans, NOT focusable, NOT
 * clickable, no hover state (D11 / W16).
 */
export function WaysToHelpPills({ tags }: WaysToHelpPillsProps) {
  // Filter to displayable tags AND preserve canonical order regardless of
  // input order. Server already canonicalizes (D3); this is defense-in-depth.
  const displayable = DISPLAYABLE_TAGS.filter((t) => tags.includes(t))

  if (displayable.length === 0) return null

  return (
    <div
      className="mb-3 flex flex-wrap gap-2"
      data-testid="ways-to-help-pills"
    >
      {displayable.map((tag) => {
        if (!isDisplayableTag(tag)) return null
        const Icon = HELP_TAG_ICONS[tag]
        const label = HELP_TAG_LABELS[tag]
        return (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80"
            aria-label={`Author would welcome: ${label}`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
          </span>
        )
      })}
    </div>
  )
}
