import { formatReference } from '@/lib/bible/verseActionRegistry'
import { useExplainPassage } from '@/hooks/bible/useExplainPassage'
import { ExplainSubViewLoading } from './ExplainSubViewLoading'
import { ExplainSubViewError } from './ExplainSubViewError'
import { ExplainSubViewDisclaimer } from './ExplainSubViewDisclaimer'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

interface ExplainSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}

/**
 * 20-verse cap — a defensive guard for over-large selections. The BB-6 action
 * sheet may already cap selection size, so this may never fire in practice,
 * but the spec requires us to render a clear error rather than send 100-verse
 * passages to Gemini (bad UX, unnecessary cost).
 */
const MAX_VERSES_PER_REQUEST = 20

/**
 * Sub-view for BB-30 "Explain this passage".
 *
 * Follows the CrossRefsSubView pattern: the component body starts with a
 * plain `<div>` — no back button, no title row, no close X. The sheet chrome
 * is rendered by `VerseActionSheet` around the sub-view. Do NOT follow the
 * NoteEditorSubView pattern (self-rendered chrome) — that causes a
 * double-header bug.
 *
 * The sub-view renders:
 *   1. Subtitle row   — "Scholarly context for {reference}"
 *   2. Context strip  — Tier 2 scripture callout with the passage text
 *   3. Divider
 *   4. One of: loading / success+body+disclaimer / error
 *
 * `onBack` and `context` are accepted per the `renderSubView` contract but
 * are not read — sheet-level navigation is handled by VerseActionSheet.
 */
export function ExplainSubView({
  selection,
  onBack: _onBack,
  context: _context,
}: ExplainSubViewProps) {
  const reference = formatReference(selection)
  const verseText = selection.verses.map((v) => v.text).join(' ')
  const verseCount = selection.endVerse - selection.startVerse + 1
  const isOverLimit = verseCount > MAX_VERSES_PER_REQUEST

  // Over-limit selections pass empty strings to the hook so the request
  // never fires — the hook is still called unconditionally to respect the
  // rules-of-hooks, but the effective status is overridden below.
  const safeReference = isOverLimit ? '' : reference
  const safeVerseText = isOverLimit ? '' : verseText
  const state = useExplainPassage(safeReference, safeVerseText)
  const effectiveStatus = isOverLimit ? 'error' : state.status

  return (
    <div>
      {/* Subtitle */}
      <div className="px-4 py-1.5">
        <span className="text-xs text-white/50">
          Scholarly context for {reference}
        </span>
      </div>

      {/* Context strip — Tier 2 scripture callout */}
      <div className="mx-4 my-2 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3">
        <p className="font-serif text-sm font-semibold text-white">{reference}</p>
        <p className="mt-1 font-serif text-sm leading-relaxed text-white/80">
          {verseText}
        </p>
      </div>

      <div className="border-t border-white/[0.08]" />

      {/* Loading state */}
      {effectiveStatus === 'loading' && <ExplainSubViewLoading />}

      {/* Over-limit error (takes precedence over hook error state) */}
      {effectiveStatus === 'error' && isOverLimit && (
        <ExplainSubViewError
          kind="unavailable"
          message={`Please select ${MAX_VERSES_PER_REQUEST} or fewer verses to explain.`}
          onRetry={() => {
            /* no-op — user must change their selection to recover */
          }}
        />
      )}

      {/* Hook error state */}
      {effectiveStatus === 'error' &&
        !isOverLimit &&
        state.errorKind &&
        state.errorMessage && (
          <ExplainSubViewError
            kind={state.errorKind}
            message={state.errorMessage}
            onRetry={state.retry}
          />
        )}

      {/* Success state */}
      {effectiveStatus === 'success' && state.result && (
        <>
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-white/90">
              {state.result.content}
            </p>
          </div>
          <ExplainSubViewDisclaimer />
        </>
      )}
    </div>
  )
}
