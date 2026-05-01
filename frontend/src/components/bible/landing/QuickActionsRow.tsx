import { useRef } from 'react'
import { BookOpen, Bookmark, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'

export function QuickActionsRow() {
  const { open, triggerRef } = useBibleDrawer()
  const browseRef = useRef<HTMLButtonElement>(null)
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()

  function handleBrowseClick() {
    triggerRef.current = browseRef.current
    open()
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Browse Books — opens the drawer */}
      <FrostedCard as="article" variant="subdued" className="min-h-[44px]">
        <button
          ref={browseRef}
          type="button"
          onClick={handleBrowseClick}
          className="flex w-full flex-col items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          <BookOpen className="h-6 w-6 text-white/70" aria-hidden="true" />
          <h3 className="text-base font-semibold text-white">Browse Books</h3>
          <p className="text-sm text-white/60">Explore all 66 books</p>
        </button>
      </FrostedCard>

      {/* My Bible — auth-gated click (BB-52 Requirement 4) */}
      <FrostedCard as="article" variant="subdued" className="min-h-[44px]">
        <Link
          to="/bible/my"
          onClick={(e) => {
            if (!isAuthenticated) {
              e.preventDefault()
              authModal?.openAuthModal(
                'Sign in to access your highlights, notes, and reading history.',
              )
            }
          }}
          className="flex flex-col items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          <Bookmark className="h-6 w-6 text-white/70" aria-hidden="true" />
          <h3 className="text-base font-semibold text-white">My Bible</h3>
          <p className="text-sm text-white/60">Highlights, notes & bookmarks</p>
        </Link>
      </FrostedCard>

      {/* Reading Plans — auth-optional */}
      <FrostedCard as="article" variant="subdued" className="min-h-[44px]">
        <Link
          to="/bible/plans"
          className="flex flex-col items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          <ListChecks className="h-6 w-6 text-white/70" aria-hidden="true" />
          <h3 className="text-base font-semibold text-white">Reading Plans</h3>
          <p className="text-sm text-white/60">Guided daily reading</p>
        </Link>
      </FrostedCard>
    </div>
  )
}
