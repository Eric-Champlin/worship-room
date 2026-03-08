import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { MixerTabContent } from './MixerTabContent'

const TABS = ['Mixer', 'Timer', 'Saved'] as const
type TabId = (typeof TABS)[number]

const TAB_PLACEHOLDERS: Record<Exclude<TabId, 'Mixer'>, string> = {
  Timer: 'Set a sleep timer',
  Saved: 'Your saved mixes and routines',
}

export function DrawerTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('Mixer')
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map())

  const setTabRef = useCallback((tab: TabId) => (el: HTMLButtonElement | null) => {
    if (el) tabRefs.current.set(tab, el)
    else tabRefs.current.delete(tab)
  }, [])

  function handleTabKeyDown(e: React.KeyboardEvent) {
    const idx = TABS.indexOf(activeTab)
    let nextIdx = -1

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextIdx = (idx + 1) % TABS.length
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      nextIdx = (idx - 1 + TABS.length) % TABS.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIdx = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIdx = TABS.length - 1
    }

    if (nextIdx >= 0) {
      const nextTab = TABS[nextIdx]
      setActiveTab(nextTab)
      tabRefs.current.get(nextTab)?.focus()
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/10" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={setTabRef(tab)}
            id={`tab-${tab}`}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`panel-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={handleTabKeyDown}
            className={cn(
              'flex-1 py-3 text-center text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-lt',
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-light hover:text-white/70',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="flex flex-1 overflow-y-auto"
      >
        {activeTab === 'Mixer' ? (
          <MixerTabContent />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-sm text-white/50">
              {TAB_PLACEHOLDERS[activeTab]}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
