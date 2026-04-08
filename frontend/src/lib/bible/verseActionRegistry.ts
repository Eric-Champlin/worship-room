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
  Layers,
  Copy,
  ClipboardCopy,
} from 'lucide-react'
import type {
  VerseSelection,
  VerseAction,
  VerseActionHandler,
  VerseActionContext,
} from '@/types/verse-actions'

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
// Stub sub-view helper
// ---------------------------------------------------------------------------

function stubSubView(text: string) {
  return (_props: { selection: VerseSelection; onBack: () => void }) =>
    React.createElement(
      'div',
      { className: 'flex items-center justify-center px-4 py-12 text-white/50 text-sm' },
      text,
    )
}

// ---------------------------------------------------------------------------
// Copy delay constant
// ---------------------------------------------------------------------------

const COPY_CLOSE_DELAY = 400

// ---------------------------------------------------------------------------
// Primary actions (display order)
// ---------------------------------------------------------------------------

const highlight: VerseActionHandler = {
  action: 'highlight',
  label: 'Highlight',
  icon: Paintbrush,
  category: 'primary',
  hasSubView: true,
  renderSubView: stubSubView('Color picker ships in BB-7'),
  isAvailable: () => true,
  onInvoke: () => {},
}

const note: VerseActionHandler = {
  action: 'note',
  label: 'Note',
  icon: PenLine,
  category: 'primary',
  hasSubView: true,
  renderSubView: stubSubView('Note editor ships in BB-8'),
  isAvailable: () => true,
  onInvoke: () => {},
}

const bookmark: VerseActionHandler = {
  action: 'bookmark',
  label: 'Bookmark',
  icon: Bookmark,
  category: 'primary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: () => {},
}

const share: VerseActionHandler = {
  action: 'share',
  label: 'Share',
  icon: Share2,
  category: 'primary',
  hasSubView: true,
  renderSubView: stubSubView('Share panel ships in BB-13'),
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
  onInvoke: () => {},
}

const journal: VerseActionHandler = {
  action: 'journal',
  label: 'Journal about this',
  sublabel: 'Open in Daily Hub \u00B7 Journal',
  icon: BookOpen,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: () => {},
}

const meditate: VerseActionHandler = {
  action: 'meditate',
  label: 'Meditate on this',
  sublabel: 'Open in Daily Hub \u00B7 Meditate',
  icon: Sparkles,
  category: 'secondary',
  hasSubView: false,
  isAvailable: () => true,
  onInvoke: () => {},
}

const crossRefs: VerseActionHandler = {
  action: 'cross-refs',
  label: 'Cross-references',
  sublabel: 'See related verses',
  icon: Link2,
  category: 'secondary',
  hasSubView: true,
  renderSubView: stubSubView('Cross-references ship in BB-9'),
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
  renderSubView: stubSubView('AI explain ships in BB-30'),
  isAvailable: () => true,
  onInvoke: () => {},
}

const memorize: VerseActionHandler = {
  action: 'memorize',
  label: 'Memorize',
  sublabel: 'Add to your deck',
  icon: Layers,
  category: 'secondary',
  hasSubView: true,
  renderSubView: stubSubView('Memorize ships in BB-45'),
  isAvailable: () => true,
  onInvoke: () => {},
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
