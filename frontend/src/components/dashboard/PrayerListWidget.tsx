import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { getPrayers, getPrayerCounts, getAnsweredThisMonth } from '@/services/prayer-list-storage'
import type { PersonalPrayer } from '@/types/personal-prayer'

export function PrayerListWidget() {
  const [counts, setCounts] = useState({ all: 0, active: 0, answered: 0 })
  const [answeredThisMonth, setAnsweredThisMonth] = useState(0)
  const [mostRecent, setMostRecent] = useState<PersonalPrayer | undefined>()

  useEffect(() => {
    setCounts(getPrayerCounts())
    setAnsweredThisMonth(getAnsweredThisMonth())

    const active = getPrayers()
      .filter((p) => p.status === 'active')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    setMostRecent(active[0])
  }, [])

  if (counts.all === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-white/60">Start your prayer list</p>
        <Button asChild variant="subtle" size="md">
          <Link to="/my-prayers">Add Prayer</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-white/60">
        {counts.active} active {counts.active === 1 ? 'prayer' : 'prayers'}
      </p>
      {mostRecent && (
        <p className="line-clamp-1 text-base font-semibold text-white">
          {mostRecent.title}
        </p>
      )}
      <p className="text-sm text-emerald-400">
        {answeredThisMonth}{' '}
        {answeredThisMonth === 1 ? 'prayer' : 'prayers'} answered this month
      </p>
      <Link
        to="/my-prayers"
        className="mt-2 inline-block text-sm font-medium text-white/80 transition-colors hover:text-white"
      >
        View all &rarr;
      </Link>
    </div>
  )
}
