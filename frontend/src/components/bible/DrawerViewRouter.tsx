import { useEffect, useRef, useState } from 'react'
import { useBibleDrawer, type DrawerView } from '@/components/bible/BibleDrawerProvider'
import { BooksDrawerContent } from '@/components/bible/BooksDrawerContent'
import { ChapterPickerView } from '@/components/bible/books/ChapterPickerView'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

const TRANSITION_MS = 220

/** Maps view types to their rendering components */
const VIEW_COMPONENTS: Record<
  string,
  React.ComponentType<{ onClose: () => void }>
> = {
  books: BooksDrawerContent,
  chapters: ChapterPickerView,
}

interface DrawerViewRouterProps {
  onClose: () => void
}

interface TransitionState {
  direction: 'push' | 'pop'
  outgoingView: DrawerView
}

export function DrawerViewRouter({ onClose }: DrawerViewRouterProps) {
  const { currentView, viewStack } = useBibleDrawer()
  const reducedMotion = useReducedMotion()
  const [transition, setTransition] = useState<TransitionState | null>(null)
  const prevViewRef = useRef<DrawerView>(currentView)
  const prevStackLenRef = useRef(viewStack.length)

  useEffect(() => {
    const prevView = prevViewRef.current
    const prevLen = prevStackLenRef.current
    const currLen = viewStack.length

    // Detect if the view actually changed
    if (
      prevView.type === currentView.type &&
      (prevView.type !== 'chapters' ||
        currentView.type !== 'chapters' ||
        prevView.bookSlug === currentView.bookSlug)
    ) {
      prevViewRef.current = currentView
      prevStackLenRef.current = currLen
      return
    }

    if (reducedMotion) {
      // Instant swap — no animation
      prevViewRef.current = currentView
      prevStackLenRef.current = currLen
      return
    }

    const direction = currLen > prevLen ? 'push' : 'pop'
    setTransition({ direction, outgoingView: prevView })

    const timer = setTimeout(() => {
      setTransition(null)
    }, TRANSITION_MS)

    prevViewRef.current = currentView
    prevStackLenRef.current = currLen

    return () => clearTimeout(timer)
  }, [currentView, viewStack.length, reducedMotion])

  const renderView = (view: DrawerView, key: string, animClass?: string) => {
    const Component = VIEW_COMPONENTS[view.type]
    if (!Component) return null
    return (
      <div
        key={key}
        className={cn('h-full w-full', transition ? 'absolute inset-0' : '', animClass)}
      >
        <Component onClose={onClose} />
      </div>
    )
  }

  // During transition: both views are mounted
  if (transition) {
    const { direction, outgoingView } = transition
    const outAnim =
      direction === 'push' ? '' : 'motion-safe:animate-view-slide-out'
    const inAnim =
      direction === 'push' ? 'motion-safe:animate-view-slide-in' : 'motion-safe:animate-view-slide-back-in'

    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderView(outgoingView, 'outgoing', outAnim)}
        {renderView(currentView, 'incoming', inAnim)}
      </div>
    )
  }

  // Steady state: single view
  return (
    <div className="relative h-full w-full overflow-hidden">
      {renderView(currentView, 'current')}
    </div>
  )
}
