import { useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  getActivePrayersWithReminders,
  hasShownRemindersToday,
  markRemindersShown,
} from '@/services/prayer-list-storage'

export function usePrayerReminders(isActive: boolean) {
  const { showToast } = useToast()

  useEffect(() => {
    if (!isActive) return
    if (hasShownRemindersToday()) return

    const prayers = getActivePrayersWithReminders()
    if (prayers.length === 0) return

    // Sort by createdAt ascending (oldest first), take first 3
    const sorted = [...prayers].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    const top3 = sorted.slice(0, 3)

    // Truncate titles to 30 chars
    const titles = top3.map((p) =>
      p.title.length > 30 ? p.title.slice(0, 30) + '...' : p.title,
    )

    const message = `Don't forget to pray for: ${titles.join(', ')}`
    showToast(message, 'success')

    markRemindersShown(top3.map((p) => p.id))
  }, [isActive, showToast])
}
