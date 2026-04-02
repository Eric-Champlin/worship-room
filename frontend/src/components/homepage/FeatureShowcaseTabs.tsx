import { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { FeatureTab } from '@/constants/feature-showcase'

interface FeatureShowcaseTabsProps {
  tabs: FeatureTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function FeatureShowcaseTabs({
  tabs,
  activeTab,
  onTabChange,
}: FeatureShowcaseTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(e: React.KeyboardEvent) {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab)
    let nextIndex = currentIndex

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else {
      return
    }

    e.preventDefault()
    onTabChange(tabs[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Feature previews"
      className="flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap px-4 sm:px-0 sm:flex-wrap sm:justify-center"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            aria-label={tab.label}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 whitespace-nowrap',
              isActive
                ? 'text-white bg-white/[0.1] border-white/[0.15] shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                : 'text-white/50 bg-transparent border-white/[0.06] hover:text-white/70 hover:bg-white/[0.05]'
            )}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
