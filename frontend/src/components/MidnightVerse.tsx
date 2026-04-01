import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWhisperToast } from '@/components/ui/WhisperToast'
import {
  hasMidnightVerseBeenShown,
  markMidnightVerseShown,
} from '@/services/surprise-storage'

const MIDNIGHT_VERSES = [
  { text: 'He who watches over Israel will neither slumber nor sleep.', reference: 'Psalm 121:4' },
  { text: 'When I said, "My foot is slipping," your loving kindness, O Lord, held me up.', reference: 'Psalm 94:18' },
  { text: "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you.", reference: 'Isaiah 26:3' },
  { text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.', reference: 'Matthew 11:28' },
]

export function MidnightVerse() {
  const { isAuthenticated } = useAuth()
  const { showWhisperToast } = useWhisperToast()

  useEffect(() => {
    if (!isAuthenticated) return

    const hour = new Date().getHours()
    if (hour > 3) return

    if (hasMidnightVerseBeenShown()) return

    markMidnightVerseShown()

    const verseIndex = new Date().getDate() % 4
    const verse = MIDNIGHT_VERSES[verseIndex]

    showWhisperToast({
      message: "Can't sleep? God is awake with you.",
      highlightedText: `${verse.text} — ${verse.reference}`,
      ctaLabel: 'Listen to sleep sounds',
      ctaTo: '/music?tab=sleep',
      duration: 10000,
      soundId: 'whisper',
    })
  }, [isAuthenticated, showWhisperToast])

  return null
}
