export interface VerseSelection {
  book: string // slug e.g. "john"
  bookName: string // display e.g. "John"
  chapter: number
  startVerse: number
  endVerse: number
  verses: Array<{ number: number; text: string }>
}

export type VerseAction =
  | 'highlight'
  | 'bookmark'
  | 'note'
  | 'share'
  | 'pray'
  | 'journal'
  | 'meditate'
  | 'cross-refs'
  | 'explain'
  | 'reflect'
  | 'memorize'
  | 'copy'
  | 'copy-with-ref'

export type VerseActionCategory = 'primary' | 'secondary'

export interface VerseActionHandler {
  action: VerseAction
  label: string
  sublabel?: string
  icon: React.ComponentType<{ className?: string }>
  category: VerseActionCategory
  /** Whether the action opens a sub-view vs fires immediately */
  hasSubView: boolean
  /** Render function for the sub-view content (if hasSubView) */
  renderSubView?: (props: {
    selection: VerseSelection
    onBack: () => void
    context?: VerseActionContext
  }) => React.ReactNode
  /** Whether this action is available for the current selection */
  isAvailable: (selection: VerseSelection) => boolean
  /** Get active/filled state — e.g. already highlighted, already bookmarked */
  getState?: (selection: VerseSelection) => { active: boolean; activeColor?: string }
  /** Optional badge to render next to the chevron in secondary action rows */
  renderBadge?: (selection: VerseSelection) => React.ReactNode
  /** Execute the action */
  onInvoke: (selection: VerseSelection, ctx: VerseActionContext) => void
}

export interface VerseActionContext {
  showToast: (message: string, type?: string, action?: { label: string; onClick: () => void }) => void
  closeSheet: (options?: { navigating?: boolean }) => void
  navigate: (url: string) => void
}
