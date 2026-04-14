import React from 'react'
import {
  Paintbrush,
  PenLine,
  Bookmark,
  Share2,
  Heart,
  BookOpen,
  Sparkles,
  Link2,
  Brain,
  Lightbulb,
  Layers,
  Copy,
  ClipboardCopy,
} from 'lucide-react'
import { CrossRefsSubView, CrossRefBadge } from '@/components/bible/reader/CrossRefsSubView'
import { ExplainSubView } from '@/components/bible/reader/ExplainSubView'
import { ReflectSubView } from '@/components/bible/reader/ReflectSubView'
import type {
  VerseSelection,
  VerseAction,
  VerseActionHandler,
  VerseActionContext,
} from '@/types/verse-actions'
import type { HighlightColor } from '@/types/bible'
import { HighlightColorPicker } from '@/components/bible/reader/HighlightColorPicker'
import {
  getHighlightForVerse,
  getHighlightsForChapter,
  applyHighlight,
  removeHighlightsInRange,
  HighlightStorageFullError,
} from '@/lib/bible/highlightStore'
import {
  isSelectionBookmarked,
  toggleBookmark as toggleBookmarkStore,
  removeBookmark as removeBookmarkById,
  restoreBookmarks,
  BookmarkStorageFullError,
} from '@/lib/bible/bookmarkStore'
import { getNoteForVerse } from '@/lib/bible/notes/store'
import { NoteEditorSubView } from '@/components/bible/reader/NoteEditorSubView'
import { ShareSubView } from '@/components/bible/reader/ShareSubView'
import { buildDailyHubVerseUrl } from '@/lib/bible/verseActions/buildDailyHubVerseUrl'
import {
  isCardForVerse,
  getCardForVerse,
  addCard as addMemorizeCard,
  removeCard as removeMemorizeCard,
} from '@/lib/memorize'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a selection as a human-readable reference string */
export function formatReference(sel: VerseSelection): string {
  if (sel.startVerse === sel.endVerse) {
    return `${sel.bookName} ${sel.chapter}:${sel.startVerse}`
  }
  return `${sel.bookName} ${sel.chapter}:${sel.startVerse}\u2013${sel.endVerse}`
}

/** Get plain text for a selection (verses joined with space) */
export function getSelectionText(sel: VerseSelection): string {
  return sel.verses.map((v) => v.text).join(' ')
}

/** Get text with reference appended */
export function getSelectionTextWithRef(sel: VerseSelection): string {
  const text = getSelectionText(sel)
  const ref = formatReference(sel)
  return `\u201C${text}\u201D \u2014 ${ref} (WEB)`
}

/** Copy text to clipboard with hidden textarea fallback */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* fall through to fallback */
    }
  }
  // Fallback: hidden textarea
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const success = document.execCommand('copy')
  document.body.removeChild(textarea)
  return success
}

// ---------------------------------------------------------------------------
// Copy delay constant
// ---------------------------------------------------------------------------

const COPY_CLOSE_DELAY = 400
const SHEET_CLOSE_DELAY = 300

// ---------------------------------------------------------------------------
// Primary actions (display order)
// ---------------------------------------------------------------------------

const highlight: VerseActionHandler = {
  action: 'highlight',
  label: 'Highlight',
  icon: Paintbrush,
  category: 'primary',
  hasSubView: true,

  getState: (selection: VerseSelection) => {
    const hl = getHighlightForVerse(selection.book, selection.chapter, selection.startVerse)
    if (!hl) return { active: false }
    return { active: true, activeColor: `var(--highlight-${hl.color})` }
  },

  renderSubView: ({ selection, onBack, context }) => {
    const chapterHighlights = getHighlightsForChapter(selection.book, selection.chapter)
    const selectedVerses = new Set<number>()
    for (let v = selection.startVerse; v <= selection.endVerse; v++) selectedVerses.add(v)

    const colorsInSelection = new Set<HighlightColor>()
    for (const hl of chapterHighlights) {
      for (let v = hl.startVerse; v <= hl.endVerse; v++) {
        if (selectedVerses.has(v)) colorsInSelection.add(hl.color)
      }
    }

    const isMixed = colorsInSelection.size > 1
    const currentColor = colorsInSelection.size === 1 ? [...colorsInSelection][0] : null

    return React.createElement(HighlightColorPicker, {
      selection,
      onBack,
      currentColor,
      isMixedSelection: isMixed,
      onApply: (color: HighlightColor) => {
        try {
          applyHighlight(
            {
              book: selection.book,
              chapter: selection.chapter,
              startVerse: selection.startVerse,
              endVerse: selection.endVerse,
            },
            color,
          )
          if (context) {
            setTimeout(() => context.closeSheet(), SHEET_CLOSE_DELAY)
          }
        } catch (e) {
          if (e instanceof HighlightStorageFullError && context) {
            context.showToast('Storage full — export your highlights and clear old ones.')
          }
        }
      },
      onRemove: () => {
        removeHighlightsInRange({
          book: selection.book,
          chapter: selection.chapter,
          startVerse: selection.startVerse,
          endVerse: selection.endVerse,
        })
        if (context) {
          setTimeout(() => context.closeSheet(), SHEET_CLOSE_DELAY)
        }
      },
    })
  },

  isAvailable: () => true,
  onInvoke: () => {},
}

const note: VerseActionHandler = {
  action: 'note',
  label: 'Note',
  icon: PenLine,
  category: 'primary',
  hasSubView: true,

  getState: (selection: VerseSelection) => {
    for (let v = selection.startVerse; v <= selection.endVerse; v++) {
      if (getNoteForVerse(selection.book, selection.chapter, v)) {
        return { active: true, activeColor: 'var(--note-marker)' }
      }
    }
    return { active: false }
  },

  renderSubView: ({ selection, onBack, context }) => {
    return React.createElement(NoteEditorSubView, {
      selection,
      onBack,
      context,
    })
  },

  isAvailable: () => true,
  onInvoke: () => {},
}

// Rapid-toggle guard for bookmark undo
let lastToggleId: string | null = null

const bookmark: VerseActionHandler = {
  action: 'bookmark',
  label: 'Bookmark',
  icon: Bookmark,
  category: 'primary',
  hasSubView: false,

  getState: (selection: VerseSelection) => {
    const active = isSelectionBookmarked(
      selection.book,
      selection.chapter,
      selection.startVerse,
      selection.endVerse,
    )
    return {
      active,
      activeColor: 'var(--bookmark-marker)',
    }
  },

  isAvailable: () => true,

  onInvoke: (selection: VerseSelection, ctx: VerseActionContext) => {
    try {
      const result = toggleBookmarkStore({
        book: selection.book,
        chapter: selection.chapter,
        startVerse: selection.startVerse,
        endVerse: selection.endVerse,
      })

      const toggleId = generateToggleId()
      lastToggleId = toggleId

      if (result.created) {
        const createdBookmark = result.bookmark!
        ctx.showToast('Bookmarked', undefined, {
          label: 'Undo',
          onClick: () => {
            if (lastToggleId !== toggleId) return // Stale undo
            removeBookmarkById(createdBookmark.id)
          },
        })
      } else {
        const removedBookmarks = result.removed ?? []
        ctx.showToast('Bookmark removed', undefined, {
          label: 'Undo',
          onClick: () => {
            if (lastToggleId !== toggleId) return // Stale undo
            restoreBookmarks(removedBookmarks)
          },
        })
      }
      // Intentionally NOT calling ctx.closeSheet() — spec req 9
    } catch (e) {
      if (e instanceof BookmarkStorageFullError) {
        ctx.showToast('Storage full — export your bookmarks and clear old ones.')
      }
    }
  },
}

function generateToggleId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const share: VerseActionHandler = {
  action: 'share',
  label: 'Share',
  icon: Share2,
  category: 'primary',
  hasSubView: true,
  renderSubView: (props) => React.createElement(ShareSubView, props),
  isAvailable: () => true,
  onInvoke: () => {},
}

// ---------------------------------------------------------------------------
// Secondary actions (display order)
// ---------------------------------------------------------------------------

const pray: VerseActionHandler = {
  action: 'pray',
  label: 'Pray about this',
  sublabel: 'Open in Daily Hub \u00B7 Pray',
  icon: Heart,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: (selection, ctx) => {
    const url = buildDailyHubVerseUrl('pray', selection)
    ctx.closeSheet({ navigating: true })
    ctx.navigate(url)
  },
}

const journal: VerseActionHandler = {
  action: 'journal',
  label: 'Journal about this',
  sublabel: 'Open in Daily Hub \u00B7 Journal',
  icon: BookOpen,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: (selection, ctx) => {
    const url = buildDailyHubVerseUrl('journal', selection)
    ctx.closeSheet({ navigating: true })
    ctx.navigate(url)
  },
}

const meditate: VerseActionHandler = {
  action: 'meditate',
  label: 'Meditate on this',
  sublabel: 'Open in Daily Hub \u00B7 Meditate',
  icon: Sparkles,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: (selection, ctx) => {
    const url = buildDailyHubVerseUrl('meditate', selection)
    ctx.closeSheet({ navigating: true })
    ctx.navigate(url)
  },
}

const crossRefs: VerseActionHandler = {
  action: 'cross-refs',
  label: 'Cross-references',
  sublabel: 'See related verses',
  icon: Link2,
  category: 'secondary',
  hasSubView: true,
  renderSubView: (props) => React.createElement(CrossRefsSubView, props),
  renderBadge: (selection) => React.createElement(CrossRefBadge, { selection }),
  isAvailable: () => true,
  onInvoke: () => {},
}

const explain: VerseActionHandler = {
  action: 'explain',
  label: 'Explain this passage',
  sublabel: 'Understand the context',
  icon: Brain,
  category: 'secondary',
  hasSubView: true,
  renderSubView: (props) => React.createElement(ExplainSubView, props),
  isAvailable: () => true,
  onInvoke: () => {},
}

const reflect: VerseActionHandler = {
  action: 'reflect',
  label: 'Reflect on this passage',
  sublabel: 'See how it might land today',
  icon: Lightbulb,
  category: 'secondary',
  hasSubView: true,
  renderSubView: (props) => React.createElement(ReflectSubView, props),
  isAvailable: () => true,
  onInvoke: () => {},
}

const memorize: VerseActionHandler = {
  action: 'memorize',
  label: 'Memorize',
  sublabel: 'Add to your deck',
  icon: Layers,
  category: 'secondary',
  hasSubView: false,

  getState: (selection: VerseSelection) => {
    const inDeck = isCardForVerse(
      selection.book,
      selection.chapter,
      selection.startVerse,
      selection.endVerse,
    )
    return { active: inDeck }
  },

  isAvailable: () => true,

  onInvoke: (sel: VerseSelection, ctx: VerseActionContext) => {
    const existing = getCardForVerse(
      sel.book,
      sel.chapter,
      sel.startVerse,
      sel.endVerse,
    )

    if (existing) {
      removeMemorizeCard(existing.id)
      ctx.showToast('Removed from memorization deck')
    } else {
      const verseText = getSelectionText(sel)
      const reference = formatReference(sel)
      addMemorizeCard({
        book: sel.book,
        bookName: sel.bookName,
        chapter: sel.chapter,
        startVerse: sel.startVerse,
        endVerse: sel.endVerse,
        verseText,
        reference,
      })
      ctx.showToast('Added to memorization deck')
    }
  },
}

const copy: VerseActionHandler = {
  action: 'copy',
  label: 'Copy',
  sublabel: 'Copy verse text',
  icon: Copy,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: (sel: VerseSelection, ctx: VerseActionContext) => {
    const text = getSelectionText(sel)
    void copyToClipboard(text)
    ctx.showToast('Copied')
    setTimeout(() => ctx.closeSheet(), COPY_CLOSE_DELAY)
  },
}

const copyWithRef: VerseActionHandler = {
  action: 'copy-with-ref',
  label: 'Copy with reference',
  sublabel: 'Copy with \u201CJohn 3:16 \u2014 WEB\u201D',
  icon: ClipboardCopy,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: (sel: VerseSelection, ctx: VerseActionContext) => {
    const text = getSelectionTextWithRef(sel)
    void copyToClipboard(text)
    ctx.showToast('Copied with reference')
    setTimeout(() => ctx.closeSheet(), COPY_CLOSE_DELAY)
  },
}

// ---------------------------------------------------------------------------
// Registry arrays (order = display order in the sheet)
// ---------------------------------------------------------------------------

const PRIMARY_ACTIONS: VerseActionHandler[] = [highlight, note, bookmark, share]
const SECONDARY_ACTIONS: VerseActionHandler[] = [
  pray,
  journal,
  meditate,
  crossRefs,
  explain,
  reflect,
  memorize,
  copy,
  copyWithRef,
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getPrimaryActions(): VerseActionHandler[] {
  return PRIMARY_ACTIONS
}

export function getSecondaryActions(): VerseActionHandler[] {
  return SECONDARY_ACTIONS
}

export function getAllActions(): VerseActionHandler[] {
  return [...PRIMARY_ACTIONS, ...SECONDARY_ACTIONS]
}

export function getActionByType(action: VerseAction): VerseActionHandler | undefined {
  return getAllActions().find((h) => h.action === action)
}
