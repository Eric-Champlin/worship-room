import { useInView } from '@/hooks/useInView'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface UseStaggeredEntranceOptions {
  /** Delay between each item in ms */
  staggerDelay: number
  /** Total number of items */
  itemCount: number
  /** Override inView state (e.g., when parent controls visibility) */
  inView?: boolean
}

interface StaggerProps {
  className: string
  style: React.CSSProperties
}

export function useStaggeredEntrance(options: UseStaggeredEntranceOptions): {
  containerRef: React.RefObject<HTMLDivElement>
  getStaggerProps: (index: number) => StaggerProps
} {
  const { staggerDelay, inView: externalInView } = options
  const reducedMotion = useReducedMotion()
  const [containerRef, observerInView] = useInView<HTMLDivElement>()

  const inView = externalInView ?? observerInView

  function getStaggerProps(index: number): StaggerProps {
    if (reducedMotion) {
      return { className: '', style: {} }
    }

    if (!inView) {
      return { className: 'opacity-0', style: {} }
    }

    return {
      className: 'motion-safe:animate-stagger-enter',
      style: { animationDelay: `${index * staggerDelay}ms` },
    }
  }

  return { containerRef, getStaggerProps }
}
