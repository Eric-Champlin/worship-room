import { QuestionOfTheDay } from '@/components/prayer-wall/QuestionOfTheDay'

interface QotdSidebarProps {
  responseCount: number
  isComposerOpen: boolean
  onToggleComposer: () => void
  onScrollToResponses: () => void
}

/**
 * Prayer Wall Redesign (2026-05-13) — sidebar wrapper for QuestionOfTheDay.
 * The wrapper exists so layout containers can apply width constraints and
 * spacing without modifying the QOTD widget itself. Forwards every prop
 * unchanged.
 */
export function QotdSidebar(props: QotdSidebarProps) {
  return <QuestionOfTheDay {...props} />
}
